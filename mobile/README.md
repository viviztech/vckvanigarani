# mobile

Bearer-facing Flutter app for the Vanigar Ani Bearer Platform — OTP login,
read-only directory search, events/pay flow, finance view, news feed. See
`../specs/001-bearer-hierarchy-register/` (and 002, 003) for the specs this
implements.

## Toolchain (this machine)

- Flutter SDK: `D:\sdks\flutter` (stable channel, added to the user PATH)
- Android SDK: `C:\Users\USER\AppData\Local\Android\sdk` (`ANDROID_HOME` set
  in the user environment), command-line tools installed, licenses accepted
- `flutter doctor` is clean except Visual Studio (Windows desktop target) —
  not needed, this app targets Android/iOS, with Chrome available for quick
  `flutter run -d chrome` checks during development

## Commands

```bash
flutter pub get      # install dependencies
flutter analyze      # static analysis
flutter test         # widget/unit tests
flutter run -d chrome   # fastest local loop — runs in a browser tab
flutter run              # run on a connected Android device/emulator
```

## Structure

See `../specs/001-bearer-hierarchy-register/plan.md` Project Structure —
`lib/features/auth/`, `lib/features/directory/`, `lib/features/events/`,
`lib/features/finance/`, `lib/features/news/`, `lib/services/`.

State management is Riverpod; HTTP via `dio`; tokens in
`flutter_secure_storage` (platform keychain/keystore, not plain prefs);
offline directory cache via `hive` (research.md §6).

## Razorpay test-mode (feature 002)

`lib/features/events/events_list_screen.dart` opens Razorpay Checkout
(`razorpay_flutter`) against the Order the backend created in
`POST /events/:id/pay`. What that Checkout screen actually does depends on
the backend's `PAYMENT_PROVIDER`:

- **`PAYMENT_PROVIDER=mock`** (backend's `.env.example` default) —
  `MockPaymentProvider` fabricates an `order_mock_...` id with no
  corresponding Razorpay order, so `razorpay.open()` will fail on-device
  (there's nothing real for Razorpay's servers to show). This mode is for
  exercising everything *except* the Checkout screen itself — API calls,
  webhook verification, the dashboard — the same way
  `specs/002-contribution-events/quickstart.md` validates the flow, by
  posting a self-signed webhook payload directly rather than tapping through
  Checkout.
- **`PAYMENT_PROVIDER=razorpay`** with a real test-mode key pair (see
  `../backend/README.md`) — Orders are real, and `keyId` in the `pay`
  response is non-null, which is what `_openCheckout` passes as Razorpay's
  `key`. This is the only configuration where tapping "Pay" actually opens a
  working Checkout sheet on a device/emulator.

To test against a backend running on this machine from a physical device
(not an emulator), pass its LAN IP: `flutter run --dart-define=API_BASE_URL=http://<lan-ip>:3000`
(see `services/api_config.dart`).

## News module (feature 003)

`lib/features/news/news_feed_screen.dart` and `post_detail.dart` render
`NewsPost.bodyHtml` (already sanitized server-side) via `flutter_html`, and
share via `share_plus`'s `SharePlus.instance.share(...)` — both work
out of the box in dev, no external service needed.

**Push notifications are not wired up** (`T015` in
`specs/003-news-announcements/tasks.md`). The backend's push provider is a
mock throughout this app — there is no `firebase_messaging` dependency, no
`google-services.json`/`GoogleService-Info.plist`, no FCM project. Setting
that up needs a real Firebase project a human has to create (same class of
external-account gap as the Razorpay setup in `../backend/README.md`).
`deepLinkFor()` in `post_detail.dart` (`vanigarani://news/:id`) is the
landing target a notification tap handler should navigate to once FCM
exists — wire it via `firebase_messaging`'s `onMessageOpenedApp` /
`getInitialMessage`, parsing the post id back out of that URI.
