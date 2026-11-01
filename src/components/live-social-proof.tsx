import { Users } from "lucide-react";

/** Pilot status, without manufactured signup counts or customer endorsements. */
export function LiveSocialProofCounter() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#1A1A1E]/90 px-4 py-2 shadow-sm">
      <Users className="h-4 w-4 text-primary-600 dark:text-primary-400" />
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Built for freelancers and independent businesses
      </p>
    </div>
  );
}

export default LiveSocialProofCounter;
