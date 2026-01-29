import { BucketList } from './components/BucketList';
import { CountdownWidget } from './components/CountdownWidget';
import { Settings, LogOut, Heart, Camera } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pb-8 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

        {/* Left Column: Profile Info & Countdown */}
        <div className="md:col-span-4 space-y-8">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-rose-100/50" />

            <div className="relative mt-8 mb-4 inline-block">
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-rose-200 flex items-center justify-center text-3xl overflow-hidden">
                {/* Placeholder for user avatar */}
                <span className="font-heading text-rose-500">A</span>
              </div>
              <button className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-sm border border-rose-50 text-muted-foreground hover:text-primary transition-colors">
                <Camera size={14} />
              </button>
            </div>

            <h2 className="font-heading text-xl font-bold text-truffle">Alex & Sam</h2>
            <p className="text-sm text-muted-foreground mb-6">Writing our story since 2023</p>

            <div className="grid grid-cols-2 gap-2 border-t border-rose-50 pt-4">
              <div className="text-center">
                <span className="block font-bold text-lg text-primary">124</span>
                <span className="text-xs text-muted-foreground">Memories</span>
              </div>
              <div className="text-center border-l border-rose-50">
                <span className="block font-bold text-lg text-primary">14</span>
                <span className="text-xs text-muted-foreground">Countries</span>
              </div>
            </div>
          </div>

          <CountdownWidget targetDate={new Date('2024-12-25')} title="Christmas Trip" />

          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors border-b border-rose-50 text-left">
              <div className="flex items-center space-x-3 text-truffle">
                <Settings size={20} className="text-muted-foreground" />
                <span className="font-medium">Settings</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors text-left text-red-500 hover:text-red-600">
              <div className="flex items-center space-x-3">
                <LogOut size={20} />
                <span className="font-medium">Log Out</span>
              </div>
            </button>
          </div>
        </div>

        {/* Right Column: Bucket List & Content */}
        <div className="md:col-span-8 space-y-8">
          <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100/50">
            <h2 className="font-heading text-xl text-primary font-bold mb-2">Our Shared Lists</h2>
            <p className="text-sm text-muted-foreground mb-6">Keep track of your dreams, dates, and favorite things.</p>

            <BucketList />
          </div>

          {/* Additional Widget Placeholder e.g. "Favorites" */}
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-6 flex flex-col items-center justify-center text-center py-12 border-dashed">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-3">
              <Heart className="text-rose-300" />
            </div>
            <h3 className="font-heading text-lg font-medium text-truffle">Favorites List</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1 mb-4">Keep track of your favorite restaurants, movies, and songs.</p>
            {/* Remove Ads Widget */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100 flex items-center justify-between w-full mt-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <Heart size={20} fill="currentColor" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-truffle">Remove Ads</h3>
                  <p className="text-sm text-muted-foreground">One-time purchase for a cleaner look.</p>
                </div>
              </div>
              <button className="px-4 py-2 bg-white text-truffle text-sm font-bold border border-amber-200 rounded-lg shadow-sm hover:bg-amber-50 transition-colors">
                $4.99
              </button>
            </div>
          </div>

          {/* Settings Section (Mobile & Desktop) */}
          <div className="md:hidden bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors border-b border-rose-50 text-left">
              <div className="flex items-center space-x-3 text-truffle">
                <Settings size={20} className="text-muted-foreground" />
                <span className="font-medium">Settings</span>
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors text-left text-red-500 hover:text-red-600">
              <div className="flex items-center space-x-3">
                <LogOut size={20} />
                <span className="font-medium">Log Out</span>
              </div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
