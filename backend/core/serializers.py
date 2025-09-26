from rest_framework import serializers
from .models import Trip, Driver, LogEntry, HOSViolation

class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ['id', 'name', 'license_number', 'created_at']

class LogEntrySerializer(serializers.ModelSerializer):
    duration_hours = serializers.ReadOnlyField()
    
    class Meta:
        model = LogEntry
        fields = ['id', 'driver', 'duty_status', 'start_time', 'end_time', 'location', 
                 'odometer', 'remarks', 'duration_hours', 'created_at']

class HOSViolationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HOSViolation
        fields = ['id', 'driver', 'violation_type', 'description', 'violation_time', 
                 'severity', 'created_at']

class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = ['id', 'driver', 'current_location', 'pickup_location', 'dropoff_location',
                 'estimated_hours', 'start_time', 'end_time', 'is_completed', 'created_at']

class HOSStatusSerializer(serializers.Serializer):
    """Serializer for HOS compliance status"""
    driver_id = serializers.IntegerField()
    current_duty_status = serializers.CharField()
    hours_driven_today = serializers.FloatField()
    hours_on_duty_today = serializers.FloatField()
    hours_in_8_day_period = serializers.FloatField()
    time_since_last_break = serializers.FloatField()
    remaining_drive_time = serializers.FloatField()
    remaining_duty_time = serializers.FloatField()
    next_required_break = serializers.DateTimeField(allow_null=True)
    violations = HOSViolationSerializer(many=True)
    can_drive = serializers.BooleanField()
    warnings = serializers.ListField(child=serializers.CharField())