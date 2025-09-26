from django.db import models
from django.utils import timezone
from datetime import datetime, timedelta

class Driver(models.Model):
    name = models.CharField(max_length=100)
    license_number = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name

class DutyStatus(models.TextChoices):
    OFF_DUTY = 'OFF', 'Off Duty'
    SLEEPER_BERTH = 'SB', 'Sleeper Berth'
    DRIVING = 'DR', 'Driving'
    ON_DUTY_NOT_DRIVING = 'ON', 'On Duty (Not Driving)'

class LogEntry(models.Model):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='log_entries')
    duty_status = models.CharField(max_length=3, choices=DutyStatus.choices)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=200)
    odometer = models.IntegerField(default=0)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-start_time']

    def duration_hours(self):
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds() / 3600
        return 0

    def __str__(self):
        return f"{self.driver.name} - {self.duty_status} at {self.start_time}"

class HOSViolation(models.Model):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='violations')
    violation_type = models.CharField(max_length=50)
    description = models.TextField()
    violation_time = models.DateTimeField()
    severity = models.CharField(max_length=20, choices=[
        ('WARNING', 'Warning'),
        ('VIOLATION', 'Violation'),
        ('CRITICAL', 'Critical')
    ])
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.driver.name} - {self.violation_type}"

class Trip(models.Model):
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='trips')
    current_location = models.CharField(max_length=200)
    pickup_location = models.CharField(max_length=200)
    dropoff_location = models.CharField(max_length=200)
    estimated_hours = models.FloatField()
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Trip for {self.driver.name} from {self.pickup_location} to {self.dropoff_location}"