import { useState } from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
} from "lucide-react";
import { listScheduleEvents } from "../data/jobs";
import { useAsync } from "../data/useAsync";
import { useShop } from "../auth/ShopProvider";
import { QueryState } from "../components/QueryState";
import { CreateJobDialog } from "../components/CreateJobDialog";
import { labelFor, type ScheduleEvent } from "../data/types";
import { isSameDay, isSameMonth } from "../format";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TYPE_COLORS: Record<string, string> = {
  installation: 'bg-blue-100 text-blue-700 border-blue-300',
  repair: 'bg-red-100 text-red-700 border-red-300',
  maintenance: 'bg-green-100 text-green-700 border-green-300',
  inspection: 'bg-purple-100 text-purple-700 border-purple-300',
  upgrade: 'bg-orange-100 text-orange-700 border-orange-300',
};
const DOT_COLORS: Record<string, string> = {
  installation: 'bg-blue-500',
  repair: 'bg-red-500',
  maintenance: 'bg-green-500',
  inspection: 'bg-purple-500',
  upgrade: 'bg-orange-500',
};
const getTypeColor = (type: string) => TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700 border-gray-300';

const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

function startOfWeek(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The Sunday-to-Saturday weeks that cover the month containing `date`. */
function monthGrid(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const start = startOfWeek(first);
  const days: Date[] = [];
  for (let d = start; d <= last || d.getDay() !== 0; d = addDays(d, 1)) days.push(d);
  return days;
}

export function Schedule() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  const { shop } = useShop();
  const { data: scheduleEvents, error, reload } = useAsync(() => listScheduleEvents(shop.id), [shop.id]);

  if (!scheduleEvents) return <QueryState error={error} onRetry={reload} />;

  const today = new Date();
  const getEventsForDate = (date: Date) =>
    // filter() returns a new array, so sorting it doesn't touch the loaded data.
    scheduleEvents
      .filter((event) => isSameDay(event.start, date))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

  const navigate = (direction: 1 | -1) => {
    const next =
      view === 'week'
        ? addDays(currentDate, 7 * direction)
        : new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1);
    setCurrentDate(next);
    if (view === 'month') setSelectedDay(next);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentDate), i));
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const title =
    view === 'month'
      ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', {
          month: weekStart.getMonth() === weekEnd.getMonth() ? undefined : 'short',
          day: 'numeric',
        })}, ${weekEnd.getFullYear()}`;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">Open jobs by scheduled time</p>
        </div>
        <CreateJobDialog
          onCreated={reload}
          trigger={
            <Button className="h-11">
              <Plus className="w-4 h-4" />
              New job
            </Button>
          }
        />
      </div>

      {/* Calendar Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="size-11 shrink-0" onClick={() => navigate(-1)} aria-label={`Previous ${view}`}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="flex-1 text-center text-lg sm:text-xl font-semibold text-gray-900 sm:min-w-56">{title}</h2>
              <Button variant="outline" size="icon" className="size-11 shrink-0" onClick={() => navigate(1)} aria-label={`Next ${view}`}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 sm:flex gap-2">
              <Button variant="outline" className="h-11" onClick={goToToday}>Today</Button>
              <Button variant={view === 'week' ? 'default' : 'outline'} className="h-11" onClick={() => setView('week')}>
                Week
              </Button>
              <Button
                variant={view === 'month' ? 'default' : 'outline'}
                className="h-11"
                onClick={() => {
                  setView('month');
                  setSelectedDay(currentDate);
                }}
              >
                Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week View: stacked days on phones, 7 columns from xl up (the sidebar eats ~270px) */}
      {view === 'week' && (
        <div className="grid grid-cols-1 xl:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const events = getEventsForDate(day);
            const isToday = isSameDay(day, today);

            return (
              <Card key={day.toISOString()} className={`gap-0 ${isToday ? 'ring-2 ring-blue-600' : ''}`}>
                <CardHeader className="pb-2 xl:pb-3">
                  <CardTitle className="flex items-baseline gap-2 xl:flex-col xl:items-center xl:gap-0">
                    <span className="text-sm text-gray-500">{DAYS[day.getDay()]}</span>
                    <span className={`text-lg xl:text-2xl font-bold xl:mt-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      <span className="xl:hidden">{day.toLocaleDateString('en-US', { month: 'short' })} </span>
                      {day.getDate()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  {events.length === 0 ? (
                    <p className="text-xs text-gray-400 xl:text-center xl:py-4">No jobs</p>
                  ) : (
                    events.map((event) => <EventChip key={event.id} event={event} />)
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Month View: calendar grid; tap a day to list its jobs */}
      {view === 'month' && (
        <>
          <Card>
            <CardContent className="p-2 sm:p-4">
              <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-1">
                {DAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-md overflow-hidden">
                {monthGrid(currentDate).map((day) => {
                  const events = getEventsForDate(day);
                  const inMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, today);
                  const isSelected = isSameDay(day, selectedDay);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      aria-label={`${day.toDateString()}, ${events.length} job${events.length === 1 ? '' : 's'}`}
                      aria-pressed={isSelected}
                      className={`min-h-14 md:min-h-24 p-1 md:p-1.5 text-left align-top flex flex-col gap-1 transition-colors ${
                        inMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                      } ${isSelected ? 'ring-2 ring-inset ring-blue-600' : 'hover:bg-blue-50'}`}
                    >
                      <span
                        className={`text-xs md:text-sm w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-blue-600 text-white font-semibold' : ''
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {/* Phones: one dot per job. */}
                      {events.length > 0 && (
                        <span className="flex flex-wrap gap-0.5 md:hidden">
                          {events.slice(0, 4).map((e) => (
                            <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[e.type] ?? 'bg-gray-500'}`} />
                          ))}
                        </span>
                      )}
                      {/* Wider screens: job titles. */}
                      <span className="hidden md:flex flex-col gap-0.5 w-full">
                        {events.slice(0, 3).map((e) => (
                          <span key={e.id} className={`text-[11px] leading-tight truncate rounded px-1 border ${getTypeColor(e.type)}`}>
                            {formatTime(e.start)} {e.title}
                          </span>
                        ))}
                        {events.length > 3 && <span className="text-[11px] text-gray-500">+{events.length - 3} more</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getEventsForDate(selectedDay).length === 0 ? (
                <p className="text-sm text-gray-500">No jobs scheduled this day.</p>
              ) : (
                getEventsForDate(selectedDay).map((event) => (
                  <Link
                    key={event.id}
                    to={`/jobs/${event.jobId}`}
                    className="flex items-center gap-4 p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="w-16 shrink-0 text-center">
                      <div className="font-medium text-gray-900">{formatTime(event.start)}</div>
                      <div className="text-sm text-gray-500">
                        {+((event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60)).toFixed(2)}h
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-gray-900">{event.title}</h4>
                        <Badge className={getTypeColor(event.type)}>{labelFor(event.type)}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.customerName}</p>
                      {event.address && <p className="text-sm text-gray-500 mt-1 truncate">{event.address}</p>}
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Job Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border ${color}`}></div>
                <span className="text-sm text-gray-700">{labelFor(type)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EventChip({ event }: { event: ScheduleEvent }) {
  return (
    <Link to={`/jobs/${event.jobId}`} className={`block p-2 rounded-lg border ${getTypeColor(event.type)} hover:opacity-80`}>
      <div className="text-sm xl:text-xs font-medium truncate">{event.title}</div>
      <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
        <Clock className="w-3 h-3" />
        {formatTime(event.start)}
      </div>
      <div className="text-xs mt-1 truncate">{event.customerName}</div>
    </Link>
  );
}
