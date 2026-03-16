import { useCallback, useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import env from '../env';
import { getLatestRelease, Release } from '../githubApi';

export function useUpdateChecker() {
  const updateAlert = useCallback((release: Release) => {
    const onUpdateNow = () =>
      release.mainAssetUrl && Linking.openURL(release.mainAssetUrl);
    const onViewChangelog = () => {
      updateAlert(release);
      Linking.openURL(release.html_url);
    };

    Alert.alert(
      'Update Available',
      `Current: ${env.APP_VERSION}\nLatest: ${release.tag_name}`,
      [
        { text: 'Later' },
        {
          text: 'View Changelog',
          onPress: onViewChangelog,
        },
        {
          isPreferred: true,
          text: 'Update Now',
          onPress: onUpdateNow,
        },
      ],
    );
  }, []);

  const checkForUpdates = useCallback(async () => {
    console.log('Checking for updates...');

    const latestRelease = await getLatestRelease();
    if (latestRelease.tag_name !== env.APP_VERSION) {
      updateAlert(latestRelease);
    }
  }, [updateAlert]);

  useEffect(() => {
    if (env.DEV_MODE) {
      return;
    }

    checkForUpdates();
  }, [checkForUpdates]);
}
