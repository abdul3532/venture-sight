import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function Auth() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const mode = searchParams.get("mode") === "signup" ? "signup" : "login";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === "signup") {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert("Check your email for the confirmation link!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate("/dealflow");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Link>

                <div className="text-center mb-8">
                    <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-xl shadow-lg shadow-primary/20 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome Back" : "Create an Account"}</h1>
                    <p className="text-muted-foreground text-sm mt-2">
                        {mode === "login" ? "Enter your credentials to access your terminal." : "Start your journey with AI-powered finance."}
                    </p>
                </div>

                <Card className="glass-card border-border/50 p-6 backdrop-blur-xl">
                    <form onSubmit={handleAuth} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    placeholder="name@example.com"
                                    className="pl-10 bg-background/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 bg-background/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {mode === "signup" && (
                            <div className="space-y-2 animate-fade-in-up">
                                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-10 bg-background/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        )}

                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-2" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === "login" ? "Sign In" : "Sign Up"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <span className="text-muted-foreground">
                            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                        </span>
                        <Link
                            to={mode === "login" ? "/auth?mode=signup" : "/auth?mode=login"}
                            className="text-primary hover:underline font-medium"
                        >
                            {mode === "login" ? "Sign up" : "Log in"}
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
