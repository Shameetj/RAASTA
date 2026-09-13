import React from 'react';
import { useNavigation } from './context/NavigationContext';
import MobileAppLayout from './components/MobileAppLayout';
import BottomTabBar from './components/BottomTabBar';

import HomePage from './pages/HomePage';
import ProfileSelectionPage from './pages/ProfileSelectionPage';
import DestinationPage from './pages/DestinationPage';
import MapPage from './pages/MapPage';
import RouteResultsPage from './pages/RouteResultsPage';
import BarrierReportPage from './pages/BarrierReportPage';

export default function App() {
  const { currentStep } = useNavigation();

  const isMapScreen = currentStep === 'map';

  return (
    <MobileAppLayout>

      <div
        className={
          isMapScreen
            ? 'flex-1 w-full min-h-0 overflow-hidden relative'
            : 'flex-1 w-full overflow-y-auto pb-20 relative'
        }
      >

        {currentStep === 'home' && (
          <HomePage />
        )}

        {currentStep === 'profile' && (
          <ProfileSelectionPage />
        )}

        {currentStep === 'destination' && (
          <DestinationPage />
        )}

        {currentStep === 'map' && (
          <MapPage />
        )}

        {currentStep === 'results' && (
          <RouteResultsPage />
        )}

        {currentStep === 'report' && (
          <BarrierReportPage />
        )}

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-30">
        <BottomTabBar />
      </div>

    </MobileAppLayout>
  );
}