import { useState } from 'react';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, IconButton, Label } from '@/components/ui';
import {
  resetProgress,
  restorePreferences,
  retrySave,
  setTheme,
  updatePreferences,
  useAppDispatch,
  useAppSelector,
} from '@/store';
import { colors, fonts, spaceThemes, type SpaceTheme } from '@/theme/tokens';
import { ChoiceGroup, SettingRow, SettingsSection } from './components';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector((state) => state.progress);
  const saveStatus = useAppSelector((state) => state.persistence.status);
  const [dialog, setDialog] = useState<
    'journey' | 'preferences' | 'privacy' | null
  >(null);
  const [notice, setNotice] = useState('');
  const theme = spaceThemes[preferences.theme];
  const totalStars = Object.values(preferences.results).reduce(
    (sum, result) => sum + result.stars,
    0,
  );
  const close = () => setDialog(null);
  return (
    <Screen>
      <View style={s.row}>
        <IconButton
          name="arrow-back"
          label="Back to home"
          onPress={() => router.replace('/')}
        />
        <Label>ORBIT ROLL</Label>
        <View style={{ width: 46 }} />
      </View>
      <View style={{ gap: 9 }}>
        <Text accessibilityRole="header" style={s.title}>
          Settings.
        </Text>
        <Text style={s.body}>Settle in. Make it comfortable.</Text>
      </View>
      <LinearGradient
        colors={['#263E35', '#101D2D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.journey}
      >
        <View style={s.row}>
          <Label color={colors.accent}>YOUR JOURNEY</Label>
          <Ionicons name="planet-outline" size={27} color={colors.accent} />
        </View>
        <View style={s.stats}>
          <View>
            <Text style={s.number}>
              {Object.keys(preferences.results).length}
              <Text style={s.body}> / 18</Text>
            </Text>
            <Text style={s.body}>Trails explored</Text>
          </View>
          <View>
            <Text style={s.number}>
              {totalStars}
              <Text style={s.body}> / 54</Text>
            </Text>
            <Text style={s.body}>Stars collected</Text>
          </View>
        </View>
        <Text accessibilityLiveRegion="polite" style={s.caption}>
          {saveStatus === 'error'
            ? 'Local storage unavailable. Changes may not survive a restart.'
            : saveStatus === 'saving'
              ? 'Saving your changes…'
              : 'Saved on this device · Play offline'}
        </Text>
        {saveStatus === 'error' && (
          <Button
            title="Retry saving"
            secondary
            icon="refresh"
            onPress={retrySave}
          />
        )}
      </LinearGradient>
      <View style={{ gap: 12 }}>
        <Label>CHOOSE YOUR ATMOSPHERE</Label>
        <LinearGradient colors={[theme.planet, '#111A2B']} style={s.preview}>
          <Ionicons name="planet-outline" size={60} color={theme.color} />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={s.name}>{theme.name}</Text>
            <Text style={s.body}>{theme.subtitle}</Text>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {theme.trail.map((color) => (
                <View
                  key={color}
                  style={{
                    height: 5,
                    flex: 1,
                    borderRadius: 5,
                    backgroundColor: color,
                  }}
                />
              ))}
            </View>
          </View>
        </LinearGradient>
        <View style={s.themeChoices}>
          {(Object.keys(spaceThemes) as SpaceTheme[]).map((id) => (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityLabel={spaceThemes[id].name}
              accessibilityState={{ checked: preferences.theme === id }}
              onPress={() => dispatch(setTheme(id))}
              style={[
                s.themeChoice,
                preferences.theme === id && {
                  borderColor: spaceThemes[id].color,
                },
              ]}
            >
              <View
                style={[s.swatch, { backgroundColor: spaceThemes[id].planet }]}
              >
                <Ionicons
                  name={
                    preferences.theme === id ? 'checkmark' : 'planet-outline'
                  }
                  size={19}
                  color={spaceThemes[id].color}
                />
              </View>
              <Text style={s.choiceName}>{spaceThemes[id].name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <SettingsSection title="PLAY YOUR WAY">
        <SettingRow
          title="Fullscreen by default"
          detail="Open levels with more space and a minimal HUD."
          icon="expand-outline"
          value={preferences.fullscreen}
          onChange={(fullscreen) => dispatch(updatePreferences({ fullscreen }))}
        />
        <SettingRow
          title="Controls"
          detail="Diagonal swipe to roll. Straight ↑ or ↓ uses a cyan lift pad. Buttons remain available for accessibility."
          icon="hand-left-outline"
        />
        <ChoiceGroup
          label="Controls"
          value={preferences.controlMode}
          options={[
            { value: 'buttons', label: 'Buttons + swipe' },
            { value: 'gestures', label: 'Gestures' },
          ]}
          onChange={(controlMode) =>
            dispatch(updatePreferences({ controlMode }))
          }
        />
        <SettingRow
          title="Swipe distance"
          detail="Choose how far to swipe before a move registers."
          icon="options-outline"
        />
        <ChoiceGroup
          label="Swipe distance"
          value={preferences.sensitivity}
          options={[
            { value: 'light', label: 'Short' },
            { value: 'balanced', label: 'Balanced' },
            { value: 'deliberate', label: 'Long' },
          ]}
          onChange={(sensitivity) =>
            dispatch(updatePreferences({ sensitivity }))
          }
        />
        <SettingRow
          title="Gameplay hints"
          detail="Show reminders for rolls, lifts, and safe drops."
          icon="bulb-outline"
          value={preferences.showHints}
          onChange={(showHints) => dispatch(updatePreferences({ showHints }))}
        />
      </SettingsSection>
      <SettingsSection title="COMFORT & ACCESSIBILITY">
        <SettingRow
          title="Haptic feedback"
          detail={
            Platform.OS === 'web'
              ? 'Available in the iOS and Android app.'
              : 'A gentle response with each landing.'
          }
          icon="phone-portrait-outline"
          value={preferences.haptics}
          disabled={Platform.OS === 'web'}
          onChange={(haptics) => dispatch(updatePreferences({ haptics }))}
        />
        <SettingRow
          title="Reduce motion"
          detail="Instant transitions and still celebrations. Your system motion preference is also respected."
          icon="accessibility-outline"
          value={preferences.reducedMotion}
          onChange={(reducedMotion) =>
            dispatch(updatePreferences({ reducedMotion }))
          }
        />
      </SettingsSection>
      <SettingsSection title="FLIGHT MANUAL">
        <SettingRow
          title="How to play"
          detail="Revisit rolls, lifts, drops, and fullscreen controls."
          icon="book-outline"
          onPress={() => router.push('/how-to-play')}
        />
        <SettingRow
          title="Replay introduction"
          detail="Visit the welcome screens and choose your controls."
          icon="sparkles-outline"
          onPress={() =>
            router.push({ pathname: '/onboarding', params: { replay: '1' } })
          }
        />
        <SettingRow
          title="Privacy & local data"
          detail="Understand what is stored on your device."
          icon="shield-checkmark-outline"
          onPress={() => setDialog('privacy')}
        />
        <SettingRow
          title="Restore default settings"
          detail="Keep your completed levels and stars."
          icon="options-outline"
          onPress={() => setDialog('preferences')}
        />
      </SettingsSection>
      <SettingsSection title="YOUR DATA">
        <SettingRow
          title="Pilot profile & cloud saves"
          detail="Sign in, manage public visibility, and invite your crew."
          icon="person-outline"
          onPress={() => router.push('/account')}
        />
        <SettingRow
          title="Reset journey"
          detail="Clear records on this device. Verified cloud records remain."
          icon="trash-outline"
          danger
          onPress={() => setDialog('journey')}
        />
      </SettingsSection>
      {!!notice && (
        <Text
          accessibilityLiveRegion="polite"
          style={[s.body, { color: colors.accent }]}
        >
          {notice}
        </Text>
      )}
      <View style={s.footer}>
        <Ionicons name="cube-outline" size={26} color={colors.muted} />
        <Text style={s.name}>orbit / roll</Text>
        <Text style={s.caption}>
          VERSION {Constants.expoConfig?.version ?? '1.0.0'} · MADE FOR A MOMENT
          OF WONDER
        </Text>
      </View>
      <Modal
        visible={dialog !== null}
        transparent
        animationType={preferences.reducedMotion ? 'none' : 'fade'}
        onRequestClose={close}
      >
        <View style={s.backdrop}>
          <ScrollView contentContainerStyle={s.dialogScroll}>
            <View style={s.dialog} accessibilityViewIsModal>
              <Ionicons
                name={
                  dialog === 'privacy'
                    ? 'shield-checkmark-outline'
                    : 'refresh-outline'
                }
                size={34}
                color={dialog === 'journey' ? colors.danger : colors.accent}
              />
              <Text accessibilityRole="header" style={s.dialogTitle}>
                {dialog === 'privacy'
                  ? 'Your data, your choice.'
                  : dialog === 'journey'
                    ? 'Start a new journey?'
                    : 'Restore your settings?'}
              </Text>
              <Text style={s.body}>
                {dialog === 'privacy'
                  ? 'Guest records and preferences stay on this device. Signed-in runs sync to Supabase for replay validation and cross-device progress. Profiles start private; public visibility and invitations are your choice. Your email is never shown on rankings. Read Privacy & data for details.'
                  : dialog === 'journey'
                    ? 'Local completed levels, stars, and best records will be cleared. Your preferences and verified cloud records remain. Cloud progress can return at the next sync.'
                    : 'Theme, controls, hints, haptics, and display preferences will return to their defaults. Your journey will stay.'}
              </Text>
              {dialog !== 'privacy' && (
                <Button
                  title={
                    dialog === 'journey'
                      ? 'Reset my journey'
                      : 'Restore defaults'
                  }
                  icon="refresh"
                  onPress={() => {
                    dispatch(
                      dialog === 'journey'
                        ? resetProgress()
                        : restorePreferences(),
                    );
                    setNotice(
                      dialog === 'journey'
                        ? 'Your journey has been reset.'
                        : 'Default settings restored.',
                    );
                    close();
                  }}
                />
              )}
              {dialog === 'privacy' && (
                <Button
                  title="Read Privacy & data"
                  secondary
                  onPress={() => {
                    close();
                    router.push('/privacy');
                  }}
                />
              )}
              <Button
                title={dialog === 'privacy' ? 'Got it' : 'Cancel'}
                secondary
                icon="close"
                onPress={close}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 37,
    lineHeight: 43,
    color: colors.text,
    letterSpacing: -1.6,
  },
  body: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 21,
  },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  journey: {
    borderRadius: 24,
    padding: 22,
    gap: 18,
    borderWidth: 1,
    borderColor: '#3C5749',
  },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
  number: { color: colors.text, fontFamily: fonts.bold, fontSize: 30 },
  caption: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 9,
    letterSpacing: 0.7,
    lineHeight: 17,
    textAlign: 'center',
  },
  preview: {
    padding: 22,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    minHeight: 132,
  },
  themeChoices: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  themeChoice: {
    flex: 1,
    minWidth: 85,
    paddingVertical: 14,
    paddingHorizontal: 6,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    alignItems: 'center',
    gap: 9,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceName: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 10,
    textAlign: 'center',
  },
  footer: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  backdrop: { flex: 1, backgroundColor: '#040812E8' },
  dialogScroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  dialog: {
    padding: 26,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    gap: 22,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  dialogTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 27,
    letterSpacing: -0.7,
  },
});
