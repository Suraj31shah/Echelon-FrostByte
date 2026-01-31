import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
    return (
        <Card className="bg-panel border-border/50 hover:border-primary/40 transition-colors duration-300">
            <CardContent className="p-6 flex flex-col items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">{title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}
