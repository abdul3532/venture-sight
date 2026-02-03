import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileStack, MessageSquare, Settings } from "lucide-react";

interface SidebarProps {
    onSettingsClick: () => void;
}

const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Deal Flow", path: "/dealflow", icon: FileStack },
    { name: "AI Associate", path: "/associate", icon: MessageSquare },
];

export function Sidebar({ onSettingsClick }: SidebarProps) {
    const location = useLocation();

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-16 bg-sidebar z-50 flex flex-col items-center py-6 border-r border-sidebar-border">
            {/* Logo */}
            <Link to="/dashboard" className="mb-8">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="text-primary-foreground font-bold text-lg">V</span>
                </div>
            </Link>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col items-center gap-2">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path === "/dealflow" && location.pathname.startsWith("/deck/"));
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={item.name}
                            className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                                isActive
                                    ? "bg-sidebar-accent text-primary"
                                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                        </Link>
                    );
                })}
            </nav>

            {/* Settings */}
            <button
                onClick={onSettingsClick}
                title="Settings"
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
            >
                <Settings className="w-5 h-5" />
            </button>
        </aside>
    );
}
