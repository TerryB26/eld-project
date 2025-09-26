from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.utils import timezone
from datetime import datetime, timedelta
from .serializers import (
    TripSerializer, DriverSerializer, LogEntrySerializer, 
    HOSViolationSerializer, HOSStatusSerializer
)
from .models import Trip, Driver, LogEntry, HOSViolation, DutyStatus
from .hos_service import HOSService
import json
# from geopy.distance import geodesic  # Optional for advanced routing

class DriverView(APIView):
    def get(self, request):
        """Get all drivers"""
        drivers = Driver.objects.all()
        serializer = DriverSerializer(drivers, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new driver"""
        serializer = DriverSerializer(data=request.data)
        if serializer.is_valid():
            driver = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class HOSStatusView(APIView):
    def get(self, request, driver_id):
        """Get comprehensive HOS status for a driver"""
        try:
            hos_service = HOSService(driver_id)
            hos_status = hos_service.get_hos_status()
            return Response(hos_status)
        except Driver.DoesNotExist:
            return Response({"error": "Driver not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DutyStatusView(APIView):
    def post(self, request, driver_id):
        """Log a duty status change"""
        try:
            hos_service = HOSService(driver_id)
            
            duty_status = request.data.get('duty_status')
            location = request.data.get('location', '')
            odometer = request.data.get('odometer', 0)
            remarks = request.data.get('remarks', '')
            
            if duty_status not in [choice[0] for choice in DutyStatus.choices]:
                return Response(
                    {"error": "Invalid duty status"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            log_entry = hos_service.log_duty_change(duty_status, location, odometer, remarks)
            serializer = LogEntrySerializer(log_entry)
            
            # Return updated HOS status along with the log entry
            hos_status = hos_service.get_hos_status()
            
            return Response({
                "log_entry": serializer.data,
                "hos_status": hos_status
            }, status=status.HTTP_201_CREATED)
            
        except Driver.DoesNotExist:
            return Response({"error": "Driver not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class LogBookView(APIView):
    def get(self, request, driver_id):
        """Get driver's logbook entries"""
        try:
            days = int(request.GET.get('days', 8))  # Default to 8 days for HOS compliance
            start_date = timezone.now() - timedelta(days=days)
            
            log_entries = LogEntry.objects.filter(
                driver_id=driver_id,
                start_time__gte=start_date
            ).order_by('-start_time')
            
            serializer = LogEntrySerializer(log_entries, many=True)
            return Response({
                "log_entries": serializer.data,
                "period_days": days
            })
            
        except ValueError:
            return Response({"error": "Invalid days parameter"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class DailyLogView(APIView):
    def get(self, request, driver_id):
        """Get detailed daily log for ELD display"""
        try:
            date_str = request.GET.get('date')
            if date_str:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            else:
                date = timezone.now().date()
            
            hos_service = HOSService(driver_id)
            daily_log = hos_service.generate_daily_logs(date)
            
            return Response(daily_log)
            
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)
        except Driver.DoesNotExist:
            return Response({"error": "Driver not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TripPlanningView(APIView):
    def post(self, request):
        """Plan a trip with HOS compliance checking"""
        try:
            driver_id = request.data.get('driver_id')
            estimated_hours = request.data.get('estimated_hours', 0)
            pickup_location = request.data.get('pickup_location', '')
            dropoff_location = request.data.get('dropoff_location', '')
            current_location = request.data.get('current_location', '')
            
            if not driver_id:
                return Response({"error": "Driver ID required"}, status=status.HTTP_400_BAD_REQUEST)
            
            hos_service = HOSService(driver_id)
            
            # Check if driver can complete the trip
            can_drive, reasons = hos_service.can_drive_for_duration(estimated_hours)
            
            if not can_drive:
                return Response({
                    "can_complete_trip": False,
                    "reasons": reasons,
                    "hos_status": hos_service.get_hos_status()
                })
            
            # Create the trip
            trip = Trip.objects.create(
                driver_id=driver_id,
                current_location=current_location,
                pickup_location=pickup_location,
                dropoff_location=dropoff_location,
                estimated_hours=estimated_hours
            )
            
            # Calculate basic route (placeholder - in real app would use mapping API)
            route = self._generate_route(current_location, pickup_location, dropoff_location)
            
            return Response({
                "can_complete_trip": True,
                "trip": TripSerializer(trip).data,
                "route": route,
                "hos_status": hos_service.get_hos_status()
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_route(self, current_location, pickup_location, dropoff_location):
        """Generate a route with realistic data based on common locations"""
        
        # Simple distance calculation based on common US cities
        location_coords = {
            'atlanta': {'lat': 33.7490, 'lng': -84.3880, 'name': 'Atlanta, GA'},
            'charlotte': {'lat': 35.2271, 'lng': -80.8431, 'name': 'Charlotte, NC'},
            'richmond': {'lat': 37.5407, 'lng': -77.4360, 'name': 'Richmond, VA'},
            'miami': {'lat': 25.7617, 'lng': -80.1918, 'name': 'Miami, FL'},
            'nashville': {'lat': 36.1627, 'lng': -86.7816, 'name': 'Nashville, TN'},
            'jacksonville': {'lat': 30.3322, 'lng': -81.6557, 'name': 'Jacksonville, FL'},
            'savannah': {'lat': 32.0835, 'lng': -81.0998, 'name': 'Savannah, GA'},
            'tampa': {'lat': 27.9506, 'lng': -82.4572, 'name': 'Tampa, FL'},
            'macon': {'lat': 32.8407, 'lng': -83.6324, 'name': 'Macon, GA'}
        }
        
        def get_coords(location_str):
            city_key = location_str.lower().split(',')[0].strip()
            return location_coords.get(city_key, {
                'lat': 33.7490, 'lng': -84.3880, 'name': location_str
            })
        
        current = get_coords(current_location)
        pickup = get_coords(pickup_location)
        dropoff = get_coords(dropoff_location)
        
        # Calculate approximate distance (simplified)
        def distance_between(loc1, loc2):
            lat_diff = abs(loc1['lat'] - loc2['lat'])
            lng_diff = abs(loc1['lng'] - loc2['lng'])
            # Rough miles calculation (1 degree ≈ 69 miles)
            return ((lat_diff ** 2 + lng_diff ** 2) ** 0.5) * 69
        
        total_distance = distance_between(current, pickup) + distance_between(pickup, dropoff)
        estimated_time = total_distance / 60  # Assuming 60 mph average
        
        waypoints = [
            {"name": "Current Location", "address": current['name'], 
             "lat": current['lat'], "lng": current['lng']},
            {"name": "Pickup Location", "address": pickup['name'], 
             "lat": pickup['lat'], "lng": pickup['lng']},
            {"name": "Dropoff Location", "address": dropoff['name'], 
             "lat": dropoff['lat'], "lng": dropoff['lng']}
        ]
        
        # Add intermediate stops for long trips
        if total_distance > 300:
            # Add a rest stop halfway - insert it before the dropoff location
            mid_lat = (pickup['lat'] + dropoff['lat']) / 2
            mid_lng = (pickup['lng'] + dropoff['lng']) / 2
            rest_stop = {
                "name": "Rest Stop", 
                "address": "Highway Rest Area",
                "lat": mid_lat, 
                "lng": mid_lng
            }
            # Insert rest stop before the last waypoint (dropoff)
            waypoints.insert(-1, rest_stop)
        
        return {
            "waypoints": waypoints,
            "total_distance_miles": round(total_distance, 1),
            "estimated_driving_time": round(estimated_time, 1)
        }

class ViolationsView(APIView):
    def get(self, request, driver_id):
        """Get HOS violations for a driver"""
        try:
            days = int(request.GET.get('days', 30))
            start_date = timezone.now() - timedelta(days=days)
            
            violations = HOSViolation.objects.filter(
                driver_id=driver_id,
                violation_time__gte=start_date
            ).order_by('-violation_time')
            
            serializer = HOSViolationSerializer(violations, many=True)
            return Response({
                "violations": serializer.data,
                "period_days": days
            })
            
        except ValueError:
            return Response({"error": "Invalid days parameter"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def hos_rules_info(request):
    """Get information about HOS rules"""
    rules = {
        "title": "Interstate Truck Driver's Guide to Hours of Service (April 2022)",
        "rules": {
            "11_hour_driving_limit": {
                "description": "Maximum 11 hours of driving allowed within the 14-hour window",
                "limit_hours": 11
            },
            "14_hour_duty_window": {
                "description": "Maximum 14 consecutive hours on-duty, including driving and on-duty not driving",
                "limit_hours": 14
            },
            "30_minute_break": {
                "description": "Required 30-minute break after 8 cumulative hours of driving",
                "trigger_hours": 8,
                "break_minutes": 30
            },
            "70_hour_8_day_rule": {
                "description": "Cannot exceed 70 hours on-duty in any 8 consecutive days",
                "limit_hours": 70,
                "period_days": 8
            },
            "10_hour_off_duty": {
                "description": "Must have at least 10 consecutive hours off-duty before starting a new 14-hour window",
                "required_hours": 10
            },
            "34_hour_restart": {
                "description": "A 34+ hour off-duty period restarts the 70-hour/8-day clock",
                "required_hours": 34
            }
        }
    }
    return Response(rules)