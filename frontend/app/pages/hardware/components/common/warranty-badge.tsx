import { Badge } from "@/components/ui/badge";

import {
    warrantyStatus,
} from "./asset-utils";

interface Props {
    warrantyDate?: string | null;
}

export function WarrantyBadge({
    warrantyDate,
}: Props) {

    const info = warrantyStatus(warrantyDate);

    return (
        <Badge variant={info.color as any}>
            {info.label}
        </Badge>
    );

}
