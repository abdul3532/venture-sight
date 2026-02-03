import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect } from "react";

export function useTour() {
    useEffect(() => {
        const hasSeenTour = localStorage.getItem("hasSeenTour_v1");

        if (!hasSeenTour) {
            const tour = driver({
                showProgress: true,
                animate: true,
                steps: [
                    {
                        element: 'h1',
                        popover: {
                            title: 'Welcome to VentureSight AI 👁️',
                            description: 'Your advanced AI venture assistant. Let\'s take a quick tour!'
                        }
                    },
                    {
                        element: '.space-y-6',
                        popover: {
                            title: 'Your Portfolio Heartbeat 💓',
                            description: 'See the immediate impact of today\'s news on your specific assets here.'
                        }
                    },
                    {
                        element: '.grid.gap-4',
                        popover: {
                            title: 'Smart News Feed 📰',
                            description: 'We analyze thousands of articles to show you only what matters, scored by sentiment.'
                        }
                    },
                    {
                        element: 'button:has(.lucide-download)',
                        popover: {
                            title: 'Executive Briefings 💼',
                            description: 'Need a report for your boss? Generate a professional PDF briefing in one click.'
                        }
                    },
                    {
                        element: 'a[href="/chat"]',
                        popover: {
                            title: 'Ask the Agent 🤖',
                            description: 'Go to the Assistant tab to ask complex questions like "Why is Tesla down today?".'
                        }
                    }
                ],
                onDestroyStarted: () => {
                    localStorage.setItem("hasSeenTour_v1", "true");
                    tour.destroy();
                }
            });

            // Small delay to ensure render
            setTimeout(() => {
                tour.drive();
            }, 1000);
        }
    }, []);
}
