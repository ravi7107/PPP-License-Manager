import { BadgeProps } from "@/components/ui/badge";

export function formatDate(value?: string | null) {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export function daysRemaining(date?: string | null) {
    if (!date) return null;

    const diff =
        new Date(date).getTime() - new Date().getTime();

    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function warrantyStatus(date?: string | null) {
    const days = daysRemaining(date);

    if (days === null)
        return {
            label: "Unknown",
            color: "secondary",
        };

    if (days < 0)
        return {
            label: "Expired",
            color: "destructive",
        };

    if (days <= 30)
        return {
            label: "30 Days",
            color: "destructive",
        };

    if (days <= 90)
        return {
            label: "90 Days",
            color: "warning",
        };

    if (days <= 180)
        return {
            label: "180 Days",
            color: "secondary",
        };

    return {
        label: "Valid",
        color: "default",
    };
}

export function statusVariant(
    status?: string
): BadgeProps["variant"] {

    switch (status?.toLowerCase()) {

        case "assigned":
            return "default";

        case "available":
            return "secondary";

        case "maintenance":
            return "outline";

        case "scrap":
            return "destructive";

        default:
            return "secondary";
    }
}
