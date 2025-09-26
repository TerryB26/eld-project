from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Sum
from .models import Driver, LogEntry, HOSViolation, DutyStatus
from typing import Dict, List, Tuple, Optional

class HOSService:
    """
    Hours of Service compliance service implementing the Interstate Truck Driver's 
    Guide to Hours of Service (April 2022) rules.
    """
    
    # HOS Rule Constants
    MAX_DRIVING_HOURS = 11  # 11-hour driving limit
    MAX_DUTY_HOURS = 14     # 14-hour driving window
    REQUIRED_BREAK_AFTER = 8  # 30-minute break required after 8 hours of driving
    MIN_BREAK_DURATION = 0.5  # 30 minutes
    MAX_70_HOUR_PERIOD = 70   # 70 hours in 8 consecutive days
    LOOKBACK_DAYS = 8         # 8-day period for 70-hour rule
    MIN_OFF_DUTY_RESET = 34   # 34-hour restart
    
    def __init__(self, driver_id: int):
        self.driver = Driver.objects.get(id=driver_id)
    
    def get_hos_status(self) -> Dict:
        """Get comprehensive HOS status for the driver"""
        now = timezone.now()
        
        # Get current duty period (since last 10+ hour off-duty)
        current_duty_start = self._get_current_duty_period_start(now)
        
        # Calculate hours for today and current duty period
        hours_driven_today = self._get_hours_driven_today(now)
        hours_on_duty_today = self._get_hours_on_duty_today(now)
        hours_driven_duty_period = self._get_hours_driven_since(current_duty_start, now)
        hours_on_duty_duty_period = self._get_hours_on_duty_since(current_duty_start, now)
        
        # Calculate 8-day period hours
        eight_days_ago = now - timedelta(days=self.LOOKBACK_DAYS)
        hours_in_8_day_period = self._get_hours_on_duty_since(eight_days_ago, now)
        
        # Check for recent breaks
        time_since_last_break = self._get_time_since_last_break(now)
        
        # Calculate remaining times
        remaining_drive_time = max(0, self.MAX_DRIVING_HOURS - hours_driven_duty_period)
        remaining_duty_time = max(0, self.MAX_DUTY_HOURS - hours_on_duty_duty_period)
        remaining_70_hour = max(0, self.MAX_70_HOUR_PERIOD - hours_in_8_day_period)
        
        # Check if 30-minute break is needed
        needs_break = (hours_driven_duty_period >= self.REQUIRED_BREAK_AFTER and 
                      time_since_last_break >= self.REQUIRED_BREAK_AFTER)
        
        # Get current duty status
        current_status = self._get_current_duty_status()
        
        # Check violations and warnings
        violations = self._check_violations(now, hours_driven_duty_period, hours_on_duty_duty_period, hours_in_8_day_period)
        warnings = self._generate_warnings(
            hours_driven_duty_period, hours_on_duty_duty_period, 
            hours_in_8_day_period, needs_break, remaining_drive_time,
            remaining_duty_time, remaining_70_hour
        )
        
        # Determine if driver can drive
        can_drive = (
            current_status in [DutyStatus.OFF_DUTY, DutyStatus.ON_DUTY_NOT_DRIVING] and
            remaining_drive_time > 0 and
            remaining_duty_time > 0 and
            remaining_70_hour > 0 and
            not needs_break and
            not any(v.severity == 'CRITICAL' for v in violations)
        )
        
        return {
            'driver_id': self.driver.id,
            'current_duty_status': current_status,
            'hours_driven_today': round(hours_driven_today, 2),
            'hours_on_duty_today': round(hours_on_duty_today, 2),
            'hours_driven_duty_period': round(hours_driven_duty_period, 2),
            'hours_on_duty_duty_period': round(hours_on_duty_duty_period, 2),
            'hours_in_8_day_period': round(hours_in_8_day_period, 2),
            'time_since_last_break': round(time_since_last_break, 2),
            'remaining_drive_time': round(remaining_drive_time, 2),
            'remaining_duty_time': round(remaining_duty_time, 2),
            'remaining_70_hour': round(remaining_70_hour, 2),
            'needs_30_min_break': needs_break,
            'next_required_break': self._calculate_next_break_time(now) if needs_break else None,
            'violations': violations,
            'warnings': warnings,
            'can_drive': can_drive,
            'current_duty_period_start': current_duty_start,
        }
    
    def log_duty_change(self, new_status: str, location: str, odometer: int = 0, remarks: str = "") -> LogEntry:
        """Log a duty status change"""
        now = timezone.now()
        
        # End the current log entry if one exists
        current_entry = LogEntry.objects.filter(
            driver=self.driver, 
            end_time__isnull=True
        ).first()
        
        if current_entry:
            current_entry.end_time = now
            current_entry.save()
        
        # Create new log entry
        log_entry = LogEntry.objects.create(
            driver=self.driver,
            duty_status=new_status,
            start_time=now,
            location=location,
            odometer=odometer,
            remarks=remarks
        )
        
        # Check for violations after status change
        self._check_and_log_violations(now)
        
        return log_entry
    
    def can_drive_for_duration(self, hours: float) -> Tuple[bool, List[str]]:
        """Check if driver can drive for the specified duration"""
        status = self.get_hos_status()
        reasons = []
        
        if not status['can_drive']:
            reasons.append("Driver is currently not eligible to drive")
        
        if hours > status['remaining_drive_time']:
            reasons.append(f"Insufficient drive time. Need {hours}h, have {status['remaining_drive_time']}h")
        
        if hours > status['remaining_duty_time']:
            reasons.append(f"Insufficient duty time. Need {hours}h, have {status['remaining_duty_time']}h")
        
        if status['needs_30_min_break']:
            reasons.append("30-minute break required before driving")
        
        return len(reasons) == 0, reasons
    
    def _get_current_duty_period_start(self, now: datetime) -> datetime:
        """Get the start of the current duty period (after last 10+ hour off-duty period)"""
        # Look for the last off-duty period of 10+ hours
        off_duty_entries = LogEntry.objects.filter(
            driver=self.driver,
            duty_status__in=[DutyStatus.OFF_DUTY, DutyStatus.SLEEPER_BERTH],
            start_time__lte=now
        ).order_by('-start_time')
        
        for entry in off_duty_entries:
            if entry.duration_hours() >= 10:
                return entry.end_time or now
        
        # If no 10+ hour break found, return 14 hours ago as max duty period
        return now - timedelta(hours=14)
    
    def _get_hours_driven_today(self, now: datetime) -> float:
        """Get total driving hours for current day"""
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return self._get_driving_hours_between(today_start, now)
    
    def _get_hours_on_duty_today(self, now: datetime) -> float:
        """Get total on-duty hours for current day"""
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        return self._get_on_duty_hours_between(today_start, now)
    
    def _get_hours_driven_since(self, start_time: datetime, end_time: datetime) -> float:
        """Get driving hours since specified start time"""
        return self._get_driving_hours_between(start_time, end_time)
    
    def _get_hours_on_duty_since(self, start_time: datetime, end_time: datetime) -> float:
        """Get on-duty hours since specified start time"""
        return self._get_on_duty_hours_between(start_time, end_time)
    
    def _get_driving_hours_between(self, start_time: datetime, end_time: datetime) -> float:
        """Calculate total driving hours between two timestamps"""
        entries = LogEntry.objects.filter(
            driver=self.driver,
            duty_status=DutyStatus.DRIVING,
            start_time__gte=start_time,
            start_time__lt=end_time
        )
        
        total_hours = 0
        for entry in entries:
            entry_end = min(entry.end_time or end_time, end_time)
            entry_start = max(entry.start_time, start_time)
            if entry_end > entry_start:
                total_hours += (entry_end - entry_start).total_seconds() / 3600
        
        return total_hours
    
    def _get_on_duty_hours_between(self, start_time: datetime, end_time: datetime) -> float:
        """Calculate total on-duty hours between two timestamps"""
        entries = LogEntry.objects.filter(
            driver=self.driver,
            duty_status__in=[DutyStatus.DRIVING, DutyStatus.ON_DUTY_NOT_DRIVING],
            start_time__gte=start_time,
            start_time__lt=end_time
        )
        
        total_hours = 0
        for entry in entries:
            entry_end = min(entry.end_time or end_time, end_time)
            entry_start = max(entry.start_time, start_time)
            if entry_end > entry_start:
                total_hours += (entry_end - entry_start).total_seconds() / 3600
        
        return total_hours
    
    def _get_time_since_last_break(self, now: datetime) -> float:
        """Get hours since last qualifying break (30+ minutes off-duty)"""
        last_break = LogEntry.objects.filter(
            driver=self.driver,
            duty_status__in=[DutyStatus.OFF_DUTY, DutyStatus.SLEEPER_BERTH],
            end_time__isnull=False,
            start_time__lt=now
        ).filter(
            # Break duration >= 30 minutes
        ).order_by('-end_time').first()
        
        if last_break and last_break.duration_hours() >= self.MIN_BREAK_DURATION:
            return (now - last_break.end_time).total_seconds() / 3600
        
        # If no break found, return time since duty period start
        duty_start = self._get_current_duty_period_start(now)
        return (now - duty_start).total_seconds() / 3600
    
    def _get_current_duty_status(self) -> str:
        """Get the driver's current duty status"""
        current_entry = LogEntry.objects.filter(
            driver=self.driver,
            end_time__isnull=True
        ).first()
        
        return current_entry.duty_status if current_entry else DutyStatus.OFF_DUTY
    
    def _check_violations(self, now: datetime, hours_driven_duty_period: float = None, 
                         hours_on_duty_duty_period: float = None, hours_in_8_day_period: float = None) -> List[HOSViolation]:
        """Check for HOS violations"""
        violations = []
        
        # Calculate values if not provided (to avoid circular dependency)
        if hours_driven_duty_period is None:
            current_duty_start = self._get_current_duty_period_start(now)
            hours_driven_duty_period = self._get_hours_driven_since(current_duty_start, now)
        
        if hours_on_duty_duty_period is None:
            current_duty_start = self._get_current_duty_period_start(now)
            hours_on_duty_duty_period = self._get_hours_on_duty_since(current_duty_start, now)
            
        if hours_in_8_day_period is None:
            eight_days_ago = now - timedelta(days=self.LOOKBACK_DAYS)
            hours_in_8_day_period = self._get_hours_on_duty_since(eight_days_ago, now)
        
        # Check 11-hour driving limit
        if hours_driven_duty_period > self.MAX_DRIVING_HOURS:
            violation = self._create_violation(
                'DRIVING_LIMIT_EXCEEDED',
                f"Exceeded 11-hour driving limit: {hours_driven_duty_period} hours",
                now,
                'CRITICAL'
            )
            violations.append(violation)
        
        # Check 14-hour duty window
        if hours_on_duty_duty_period > self.MAX_DUTY_HOURS:
            violation = self._create_violation(
                'DUTY_WINDOW_EXCEEDED',
                f"Exceeded 14-hour duty window: {hours_on_duty_duty_period} hours", 
                now,
                'CRITICAL'
            )
            violations.append(violation)
        
        # Check 70-hour rule
        if hours_in_8_day_period > self.MAX_70_HOUR_PERIOD:
            violation = self._create_violation(
                '70_HOUR_RULE_EXCEEDED',
                f"Exceeded 70 hours in 8 days: {hours_in_8_day_period} hours",
                now,
                'CRITICAL'
            )
            violations.append(violation)
        
        # Check 30-minute break requirement - simplified check
        current_status = self._get_current_duty_status()
        time_since_break = self._get_time_since_last_break(now)
        if (hours_driven_duty_period >= self.REQUIRED_BREAK_AFTER and 
            time_since_break >= self.REQUIRED_BREAK_AFTER and 
            current_status == DutyStatus.DRIVING):
            violation = self._create_violation(
                'BREAK_REQUIRED',
                "30-minute break required after 8 hours of driving",
                now,
                'VIOLATION'
            )
            violations.append(violation)
        
        return violations
    
    def _generate_warnings(self, hours_driven_duty: float, hours_on_duty: float, 
                          hours_8_day: float, needs_break: bool, 
                          remaining_drive: float, remaining_duty: float, 
                          remaining_70: float) -> List[str]:
        """Generate warning messages for approaching limits"""
        warnings = []
        
        # Driving limit warnings
        if remaining_drive <= 1:
            warnings.append(f"Approaching 11-hour driving limit. {remaining_drive:.1f} hours remaining.")
        
        # Duty window warnings
        if remaining_duty <= 2:
            warnings.append(f"Approaching 14-hour duty window limit. {remaining_duty:.1f} hours remaining.")
        
        # 70-hour rule warnings
        if remaining_70 <= 5:
            warnings.append(f"Approaching 70-hour limit. {remaining_70:.1f} hours remaining.")
        
        # Break requirement warning
        if hours_driven_duty >= (self.REQUIRED_BREAK_AFTER - 1) and not needs_break:
            warnings.append("30-minute break will be required soon.")
        
        if needs_break:
            warnings.append("30-minute break required before continuing to drive.")
        
        return warnings
    
    def _create_violation(self, violation_type: str, description: str, 
                         violation_time: datetime, severity: str) -> HOSViolation:
        """Create and save a HOS violation"""
        return HOSViolation.objects.create(
            driver=self.driver,
            violation_type=violation_type,
            description=description,
            violation_time=violation_time,
            severity=severity
        )
    
    def _check_and_log_violations(self, now: datetime):
        """Check for violations and log them"""
        violations = self._check_violations(now)
        # Violations are already created in _check_violations
        return violations
    
    def _calculate_next_break_time(self, now: datetime) -> Optional[datetime]:
        """Calculate when the next break must be taken"""
        if self._get_time_since_last_break(now) >= self.REQUIRED_BREAK_AFTER:
            return now  # Break needed immediately
        return None
    
    def generate_daily_logs(self, date: datetime = None) -> Dict:
        """Generate daily log data for ELD display"""
        if date is None:
            date = timezone.now().date()
        
        start_of_day = timezone.make_aware(datetime.combine(date, datetime.min.time()))
        end_of_day = start_of_day + timedelta(days=1)
        
        entries = LogEntry.objects.filter(
            driver=self.driver,
            start_time__gte=start_of_day,
            start_time__lt=end_of_day
        ).order_by('start_time')
        
        # Create 24-hour grid (15-minute intervals)
        intervals = []
        current_time = start_of_day
        
        while current_time < end_of_day:
            # Find the duty status for this time interval
            status = self._get_status_at_time(current_time, entries)
            intervals.append({
                'time': current_time,
                'status': status,
                'minutes': 15
            })
            current_time += timedelta(minutes=15)
        
        return {
            'date': date,
            'intervals': intervals,
            'summary': {
                'total_drive_time': self._get_driving_hours_between(start_of_day, end_of_day),
                'total_on_duty_time': self._get_on_duty_hours_between(start_of_day, end_of_day),
                'violations': HOSViolation.objects.filter(
                    driver=self.driver,
                    violation_time__gte=start_of_day,
                    violation_time__lt=end_of_day
                )
            }
        }
    
    def _get_status_at_time(self, target_time: datetime, entries) -> str:
        """Get the duty status at a specific time"""
        for entry in entries:
            if entry.start_time <= target_time:
                if entry.end_time is None or entry.end_time > target_time:
                    return entry.duty_status
        return DutyStatus.OFF_DUTY
