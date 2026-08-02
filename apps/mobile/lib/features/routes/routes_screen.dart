import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";

import "../../data/models/route_models.dart";
import "../../providers/app_providers.dart";
import "../payment/record_payment_screen.dart";
import "../sync/pending_sync_banner.dart";

class RoutesScreen extends ConsumerWidget {
  const RoutesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen(connectivityOnlineProvider, (previous, next) {
      if (next.asData?.value == true) {
        ref.read(syncControllerProvider).flush();
      }
    });

    final authUser = ref.watch(authStateProvider).valueOrNull;
    final routesAsync = ref.watch(myRoutesProvider);
    final money = NumberFormat.currency(locale: "es_CO", symbol: "\$", decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Rutas del día"),
        actions: [
          IconButton(
            tooltip: "Sincronizar",
            onPressed: () async {
              final result = await ref.read(syncControllerProvider).flush();
              if (!context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    result.skippedOffline
                        ? "Sin conexión"
                        : "Sync: ${result.synced} ok, ${result.failed} error(es)",
                  ),
                ),
              );
            },
            icon: const Icon(Icons.sync),
          ),
          IconButton(
            tooltip: "Salir",
            onPressed: () => ref.read(authStateProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: Column(
        children: [
          if (authUser != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  "Hola, ${authUser.firstName}",
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ),
          const PendingSyncBanner(),
          Expanded(
            child: routesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(e.toString(), textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () => ref.invalidate(myRoutesProvider),
                        child: const Text("Reintentar"),
                      ),
                    ],
                  ),
                ),
              ),
              data: (routes) {
                if (routes.isEmpty) {
                  return const Center(
                    child: Text("No tienes rutas asignadas para hoy"),
                  );
                }
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: routes.length,
                  itemBuilder: (context, index) {
                    final route = routes[index];
                    return _RouteCard(
                      route: route,
                      money: money,
                      onClientTap: (client) {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => RecordPaymentScreen(client: client),
                          ),
                        );
                      },
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _RouteCard extends StatelessWidget {
  const _RouteCard({
    required this.route,
    required this.money,
    required this.onClientTap,
  });

  final CollectorRoute route;
  final NumberFormat money;
  final void Function(RouteClient client) onClientTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(route.name, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              "${route.clients.length} clientes · turno ${route.shift}",
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (route.collectedTodayPct != null) ...[
              const SizedBox(height: 8),
              LinearProgressIndicator(value: route.collectedTodayPct! / 100),
              Text("${route.collectedTodayPct!.toStringAsFixed(0)}% cobrado hoy"),
            ],
            const Divider(height: 24),
            ...route.clients.map(
              (client) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(client.fullName),
                subtitle: Text(
                  "${client.code} · ${client.visitStatus}${client.overdueInstallmentCount > 0 ? " · ${client.overdueInstallmentCount} vencida(s)" : ""}",
                ),
                trailing: Text(money.format(client.amountDue)),
                onTap: () => onClientTap(client),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
