import "package:flutter/material.dart";
import "package:flutter_localizations/flutter_localizations.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/date_symbol_data_local.dart";
import "package:shared_preferences/shared_preferences.dart";

import "features/cash_box/cash_box_screen.dart";
import "features/clients/client_profile_screen.dart";
import "features/clients/existing_client_screen.dart";
import "features/clients/new_client_screen.dart";
import "features/auth/auth_home.dart";
import "features/auth/login_screen.dart";
import "features/auth/register_screen.dart";
import "features/notifications/notifications_screen.dart";
import "features/sync/sync_queue_screen.dart";
import "providers/app_providers.dart";

class DpsApp extends ConsumerWidget {
  const DpsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return MaterialApp(
      title: "Daily Payment",
      locale: const Locale("es"),
      supportedLocales: const [
        Locale("es"),
        Locale("es", "UY"),
        Locale("en"),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A56DB)),
        useMaterial3: true,
      ),
      home: authState.when(
        loading: () => const _SplashScreen(),
        error: (_, __) => const LoginScreen(),
        data: (user) => AuthHome(user: user),
      ),
      routes: {
        RegisterScreen.routeName: (_) => const RegisterScreen(),
        NotificationsScreen.routeName: (_) => const NotificationsScreen(),
        SyncQueueScreen.routeName: (_) => const SyncQueueScreen(),
        ClientProfileScreen.routeName: (_) => const _MissingRouteArgsScreen(),
        NewClientScreen.routeName: (_) => const NewClientScreen(),
        ExistingClientScreen.routeName: (_) => const ExistingClientScreen(),
        CashBoxScreen.routeName: (_) => const CashBoxScreen(),
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}

class _MissingRouteArgsScreen extends StatelessWidget {
  const _MissingRouteArgsScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: const Center(child: Text("Abre esta pantalla desde la lista de rutas.")),
    );
  }
}

Future<void> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting("es", null);
  await initializeDateFormatting("es_UY", null);
  final prefs = await SharedPreferences.getInstance();
  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: const DpsApp(),
    ),
  );
}
