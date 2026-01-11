'use client'
import Link from "next/link";
import ThemeSwitch from "../buttons/ThemeSwitch";
import { usePathname } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { Crown, Sparkles } from "lucide-react";

export default function Header() {
    const pathname = usePathname();
    const { user, signOut, isPremium, usageInfo } = useAuth();

    if (pathname.startsWith("/projects/")) {
        return null;
    }

    if (pathname === "/login") {
        return null;
    }

    const handleSignOut = async () => {
        try {
            await signOut();
            toast.success('Signed out successfully');
        } catch (error) {
            toast.error('Failed to sign out');
        }
    };

    return (
        <header className="bg-black border-b border-gray-800 shadow-sm">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center">
                    <Link href="/" className="text-3xl dark:text-gray-100">InstaEdit</Link>
                </div>
                <nav className="flex items-center">
                    <ul className="flex space-x-2 mr-2">
                        <li>
                            <Link
                                href="/"
                                className="text-md text-white hover:text-gray-800 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Home
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/projects"
                                className="text-md text-white hover:text-gray-800 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                Projects
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/about"
                                className="text-md text-white hover:text-gray-800 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                About Me
                            </Link>
                        </li>
                    </ul>
                    {user && (
                        <div className="flex items-center gap-4 ml-4">
                            {/* Subscription Badge/Button */}
                            <Link
                                href="/subscription"
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                                    isPremium 
                                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50'
                                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                                }`}
                            >
                                {isPremium ? (
                                    <>
                                        <Crown className="w-4 h-4 text-yellow-400" />
                                        <span className="text-sm font-medium text-purple-300">Pro</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 text-purple-400" />
                                        <span className="text-sm font-medium text-slate-300">
                                            {usageInfo?.used || 0}/{typeof usageInfo?.limit === 'number' ? usageInfo.limit : 3}
                                        </span>
                                        <span className="text-xs text-purple-400 font-medium ml-1">Upgrade</span>
                                    </>
                                )}
                            </Link>
                            
                            <div className="flex items-center gap-2">
                                {user.user_metadata?.avatar_url && (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt={user.email || 'User'}
                                        className="w-8 h-8 rounded-full"
                                    />
                                )}
                                <span className="text-sm text-white">
                                    {user.email || user.user_metadata?.full_name || 'User'}
                                </span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="text-sm text-white hover:text-gray-300 px-3 py-1 rounded-md hover:bg-gray-800 transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                    {/* <ThemeSwitch /> */}
                </nav>
            </div>
        </header>
    );
}
