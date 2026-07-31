import { Badge } from "@/components/ui/badge";

import { statusVariant } from "./asset-utils";

interface Props {
    status?: string;
}

export function StatusBadge({
    status,
}: Props) {

    return (
        <Badge variant={statusVariant(status)}>
            {status || "-"}
        </Badge>
    );

}
