import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";
import { mockScheduleEvents } from "../data/mockData";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'installation': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'repair': return 'bg-red-100 text-red-700 border-red-300';
      case 'maintenance': return 'bg-green-100 text-green-700 border-green-300';
      case 'inspection': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'upgrade': return 'bg-orange-100 text-orange-700 border-orange-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const getEventsForDate = (date: Date) => {
    return mockScheduleEvents.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">Manage your job calendar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={goToToday}>Today</Button>
          <Button>
            <CalendarIcon className="w-4 h-4 mr-2" />
            Add to Calendar
          </Button>
        </div>
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold text-gray-900">
                {MONTHS[weekDays[0].getMonth()]} {weekDays[0].getDate()} - {MONTHS[weekDays[6].getMonth()]} {weekDays[6].getDate()}, {weekDays[0].getFullYear()}
              </h2>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={view === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('week')}
              >
                Week
              </Button>
              <Button
                variant={view === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('month')}
              >
                Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week View */}
      {view === 'week' && (
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const events = getEventsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <Card key={index} className={isToday ? 'ring-2 ring-blue-600' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-center">
                    <div className="text-sm text-gray-500">{DAYS[day.getDay()]}</div>
                    <div className={`text-2xl font-bold mt-1 ${
                      isToday ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {day.getDate()}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {events.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No jobs</p>
                  ) : (
                    events.map((event) => (
                      <div
                        key={event.id}
                        className={`p-2 rounded-lg border ${getTypeColor(event.type)}`}
                      >
                        <div className="text-xs font-medium truncate">
                          {event.title}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
                          <Clock className="w-3 h-3" />
                          {event.start.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs mt-1 truncate">
                          {event.customerName}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Month View (List) */}
      {view === 'month' && (
        <Card>
          <CardHeader>
            <CardTitle>All Scheduled Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockScheduleEvents
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-16 text-center">
                      <div className="text-sm text-gray-500">
                        {event.start.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {event.start.getDate()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <Badge className={getTypeColor(event.type)}>
                          {event.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.customerName}</p>
                      <p className="text-sm text-gray-500 mt-1">{event.address}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {event.start.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60))}h
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Job Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
              <span className="text-sm text-gray-700">Installation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
              <span className="text-sm text-gray-700">Repair</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
              <span className="text-sm text-gray-700">Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-100 border border-purple-300"></div>
              <span className="text-sm text-gray-700">Inspection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
              <span className="text-sm text-gray-700">Upgrade</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
