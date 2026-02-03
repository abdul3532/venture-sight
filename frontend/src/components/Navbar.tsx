import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Inbox, MessageSquare, Target } from "lucide-react";

export function Navbar() {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

    return (
        <nav className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link to="/dealflow" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                                <Target className="w-5 h-5 text-primary" />
                            </div>
                            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                                VentureSight AI
                            </h1>
                        </Link>
                        <div className="flex gap-1">
                            <Link to="/dealflow">
                                <Button
                                    variant={isActive("/dealflow") || isActive("/deck") ? "default" : "ghost"}
                                    className="gap-2"
                                >
                                    <Inbox className="h-4 w-4" />
                                    Deal Flow
                                </Button>
                            </Link>
                            <Link to="/associate">
                                <Button
                                    variant={isActive("/associate") ? "default" : "ghost"}
                                    className="gap-2"
                                >
                                    <MessageSquare className="h-4 w-4" />
                                    AI Associate
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
