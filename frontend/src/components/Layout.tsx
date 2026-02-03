import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FileUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./Sidebar";
import { SettingsModal } from "./SettingsModal";
import { supabase } from "@/lib/supabase";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [userName, setUserName] = useState("User");

    useEffect(() => {
        supabase.auth.getUser().then(({ data }: { data: { user: { email?: string } | null } }) => {
            if (data?.user?.email) {
                setUserName(data.user.email.split("@")[0]);
            }
        });
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    // Check if we're on a page that should have the welcome header
    const showWelcomeHeader = location.pathname === "/dashboard" || location.pathname === "/dealflow";

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
            {/* Dark Icon Sidebar */}
            <Sidebar onSettingsClick={() => setSettingsOpen(true)} />

            {/* Main Content Area */}
            <div className="ml-16">
                {/* Top Header Bar */}
                <header className="sticky top-0 z-40 px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-border/40">
                    <div className="flex items-center justify-between max-w-[1600px] mx-auto">
                        {/* Left: Welcome message or breadcrumb */}
                        <div className="flex items-center gap-3">
                            {showWelcomeHeader ? (
                                <h1 className="text-xl font-semibold">
                                    Welcome back, <span className="text-primary">{userName}</span>
                                </h1>
                            ) : (
                                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Link to="/dealflow" className="hover:text-foreground transition-colors">
                                        Deal Flow
                                    </Link>
                                    <span>/</span>
                                    <span className="text-foreground">Analysis</span>
                                </nav>
                            )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => navigate("/dealflow")}
                            >
                                <FileUp className="w-4 h-4" />
                                Submit Deal
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md cursor-pointer hover:ring-2 ring-primary ring-offset-2 ring-offset-background transition-all">
                                        <span className="text-xs font-medium text-primary-foreground">
                                            {userName.slice(0, 2).toUpperCase()}
                                        </span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => navigate("/onboarding")}>
                                        <Target className="mr-2 h-4 w-4" />
                                        <span>Investment Thesis</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Logout</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-6 max-w-[1600px] mx-auto animate-fade-in">
                    {children}
                </main>
            </div>

            <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
    );
}
