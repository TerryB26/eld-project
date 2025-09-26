from django.contrib import admin
from django.urls import path, include
from core.views import (
    DriverView, HOSStatusView, DutyStatusView, LogBookView, 
    DailyLogView, TripPlanningView, ViolationsView, hos_rules_info
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Driver management
    path('api/drivers/', DriverView.as_view(), name='drivers'),
    
    # HOS Status and Compliance
    path('api/drivers/<int:driver_id>/hos-status/', HOSStatusView.as_view(), name='hos-status'),
    path('api/drivers/<int:driver_id>/duty-status/', DutyStatusView.as_view(), name='duty-status-change'),
    
    # Logbook and Daily Logs
    path('api/drivers/<int:driver_id>/logbook/', LogBookView.as_view(), name='logbook'),
    path('api/drivers/<int:driver_id>/daily-log/', DailyLogView.as_view(), name='daily-log'),
    
    # Trip Planning
    path('api/trips/plan/', TripPlanningView.as_view(), name='trip-planning'),
    
    # Violations
    path('api/drivers/<int:driver_id>/violations/', ViolationsView.as_view(), name='violations'),
    
    # HOS Rules Information
    path('api/hos-rules/', hos_rules_info, name='hos-rules'),
]