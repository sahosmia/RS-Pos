import { type RowAction } from '@/components/data-table/data-table-row-actions';
import { type ServiceRequestListItem, type ServiceRequestStatusValue } from '@/types/models';
import { CalendarClock, CircleCheck, CircleX, Pencil } from 'lucide-react';

interface Handlers {
    /** Opens the update dialog for this request, with the chosen step already selected (null = just edit the details). */
    onUpdate: (request: ServiceRequestListItem, preset: ServiceRequestStatusValue | null) => void;
}

/** What can be done to a request right now. Completed and cancelled are final, so they get no actions. */
export function getServiceRequestActions(request: ServiceRequestListItem, { onUpdate }: Handlers): RowAction[] {
    const can = (status: ServiceRequestStatusValue) => request.next_statuses.includes(status);

    return [
        { label: 'Mark completed', icon: CircleCheck, onClick: () => onUpdate(request, 'completed'), hidden: !can('completed') },
        { label: 'Schedule a date', icon: CalendarClock, onClick: () => onUpdate(request, 'scheduled'), hidden: !can('scheduled') },
        { label: 'Assign technician / edit', icon: Pencil, onClick: () => onUpdate(request, null), hidden: request.next_statuses.length === 0 },
        {
            label: 'Cancel request',
            icon: CircleX,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => onUpdate(request, 'cancelled'),
            hidden: !can('cancelled'),
        },
    ];
}
