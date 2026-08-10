import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";

import "../../core/utils/collection_status.dart";
import "../../core/utils/credit_renewal.dart";
import "../../core/utils/visit_shift.dart";
import "../../data/models/route_models.dart";
import "../../providers/app_providers.dart";
import "../notifications/notifications_screen.dart";
import "../cash_box/cash_box_screen.dart";
import "../clients/client_profile_screen.dart";
import "../clients/existing_client_screen.dart";
import "../clients/new_client_screen.dart";
import "../payment/record_payment_screen.dart";
import "../sync/pending_sync_banner.dart";
import "../sync/sync_queue_screen.dart";

const _shiftOptions = visitShiftFilterOptions;

class RoutesScreen extends ConsumerStatefulWidget {
  const RoutesScreen({super.key});

  @override
  ConsumerState<RoutesScreen> createState() => _RoutesScreenState();
}

class _RoutesScreenState extends ConsumerState<RoutesScreen> {
  final _searchController = TextEditingController();
  Timer? _searchDebounce;
  final Set<String> _collapsedRouteIds = {};
  final Set<String> _visitedExpandedRouteIds = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(pushNotificationServiceProvider).registerTokenIfAvailable();
    });
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      ref.read(clientSearchQueryProvider.notifier).state = value;
    });
  }

  void _clearSearch() {
    _searchController.clear();
    ref.read(clientSearchQueryProvider.notifier).state = "";
  }

  void _showClientMenu() {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person_add_outlined),
              title: const Text("Nuevo cliente"),
              subtitle: const Text("Crédito nuevo desde hoy"),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).pushNamed(NewClientScreen.routeName);
              },
            ),
            ListTile(
              leading: const Icon(Icons.history),
              title: const Text("Cliente existente"),
              subtitle: const Text("Crédito ya iniciado con fecha anterior"),
              onTap: () {
                Navigator.pop(context);
                Navigator.of(context).pushNamed(ExistingClientScreen.routeName);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _toggleRouteCollapsed(String routeId) {
    setState(() {
      if (_collapsedRouteIds.contains(routeId)) {
        _collapsedRouteIds.remove(routeId);
      } else {
        _collapsedRouteIds.add(routeId);
      }
    });
  }

  void _toggleVisitedExpanded(String routeId) {
    setState(() {
      if (_visitedExpandedRouteIds.contains(routeId)) {
        _visitedExpandedRouteIds.remove(routeId);
      } else {
        _visitedExpandedRouteIds.add(routeId);
      }
    });
  }

  Future<void> _openClientVisit(
    RouteClient client, {
    int initialTabIndex = 0,
  }) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RecordPaymentScreen(
          client: client,
          initialTabIndex: initialTabIndex,
        ),
      ),
    );
    ref.invalidate(myRoutesProvider);
  }

  Future<void> _reversePayment(RouteClient client) async {
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Revertir pago"),
        content: TextField(
          controller: reasonController,
          decoration: const InputDecoration(
            labelText: "Motivo",
            border: OutlineInputBorder(),
          ),
          maxLines: 2,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancelar"),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Revertir"),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    final paymentId = client.todayPaymentId;
    if (paymentId == null) return;
    try {
      await ref.read(paymentsApiProvider).reverse(
            paymentId: paymentId,
            reason: reasonController.text.trim().isEmpty
                ? "Corrección"
                : reasonController.text.trim(),
          );
      ref.invalidate(myRoutesProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Pago revertido")),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("No se pudo revertir: $e")),
      );
    } finally {
      reasonController.dispose();
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(connectivityOnlineProvider, (previous, next) {
      if (next.asData?.value == true) {
        ref.read(syncControllerProvider).flush();
      }
    });

    final authUser = ref.watch(authStateProvider).valueOrNull;
    final selectedShift = ref.watch(selectedShiftProvider);
    final routesAsync = ref.watch(myRoutesProvider);
    final searchQuery = ref.watch(clientSearchQueryProvider);
    final searchAsync = ref.watch(clientSearchResultsProvider);
    final isSearching = searchQuery.trim().length >= 2;
    final money = NumberFormat.currency(locale: "es_UY", symbol: "\$", decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Rutas del día"),
        actions: [
          IconButton(
            tooltip: "Mi caja",
            onPressed: () {
              Navigator.of(context).pushNamed(CashBoxScreen.routeName);
            },
            icon: const Icon(Icons.account_balance_wallet_outlined),
          ),
          IconButton(
            tooltip: "Notificaciones",
            onPressed: () {
              Navigator.of(context).pushNamed(NotificationsScreen.routeName);
            },
            icon: const Icon(Icons.notifications_outlined),
          ),
          IconButton(
            tooltip: "Cola de sync",
            onPressed: () {
              Navigator.of(context).pushNamed(SyncQueueScreen.routeName);
            },
            icon: const Icon(Icons.cloud_queue),
          ),
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showClientMenu,
        icon: const Icon(Icons.person_add_outlined),
        label: const Text("Cliente"),
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
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: "Buscar por nombre, cédula o código",
                prefixIcon: const Icon(Icons.search),
                suffixIcon: isSearching
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: _clearSearch,
                      )
                    : null,
                border: const OutlineInputBorder(),
                isDense: true,
              ),
              textInputAction: TextInputAction.search,
              onChanged: _onSearchChanged,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _shiftOptions.map((option) {
                  final selected = selectedShift == option.value;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(option.label),
                      selected: selected,
                      onSelected: (_) {
                        ref.read(selectedShiftProvider.notifier).state =
                            option.value;
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const PendingSyncBanner(),
          Expanded(
            child: isSearching
                ? _SearchResultsList(
                    searchAsync: searchAsync,
                    money: money,
                    onClientProfile: (client) {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ClientProfileScreen(client: client),
                        ),
                      );
                    },
                    onRegisterPayment: (client) => _openClientVisit(client),
                  )
                : routesAsync.when(
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
                      final filteredRoutes = routes
                          .map((route) => route.withVisitShiftFilter(selectedShift))
                          .where((route) =>
                              selectedShift == null || route.clients.isNotEmpty)
                          .toList();
                      if (filteredRoutes.isEmpty) {
                        return Center(
                          child: Text(
                            routes.isEmpty
                                ? "No tienes rutas asignadas para hoy"
                                : "No hay clientes para el turno seleccionado",
                          ),
                        );
                      }
                      return ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredRoutes.length,
                        itemBuilder: (context, index) {
                          final route = filteredRoutes[index];
                          final isCollapsed = _collapsedRouteIds.contains(route.id);
                          return _RouteCard(
                            route: route,
                            money: money,
                            isCollapsed: isCollapsed,
                            visitedCollapsed:
                                !_visitedExpandedRouteIds.contains(route.id),
                            onToggleCollapse: () => _toggleRouteCollapsed(route.id),
                            onToggleVisitedCollapse: () =>
                                _toggleVisitedExpanded(route.id),
                            onClientProfile: (client) {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => ClientProfileScreen(client: client),
                                ),
                              );
                            },
                            onRegisterPayment: (client) {
                              _openClientVisit(client);
                            },
                            onRenewCredit: (client) {
                              _openClientVisit(client, initialTabIndex: 1);
                            },
                            onReversePayment: _reversePayment,
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

class _SearchResultsList extends StatelessWidget {
  const _SearchResultsList({
    required this.searchAsync,
    required this.money,
    required this.onClientProfile,
    required this.onRegisterPayment,
  });

  final AsyncValue<List<RouteClientSearchResult>> searchAsync;
  final NumberFormat money;
  final void Function(RouteClient client) onClientProfile;
  final void Function(RouteClient client) onRegisterPayment;

  @override
  Widget build(BuildContext context) {
    return searchAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(e.toString(), textAlign: TextAlign.center),
        ),
      ),
      data: (results) {
        if (results.isEmpty) {
          return const Center(
            child: Text("No se encontraron clientes"),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: results.length,
          itemBuilder: (context, index) {
            final result = results[index];
            final client = result.toRouteClient();
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(
                  result.fullName,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  "${result.code}"
                  "${result.nationalId != null && result.nationalId!.isNotEmpty ? " · ${result.nationalId}" : ""}"
                  " · ${result.routeName}",
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(money.format(result.amountDue)),
                    IconButton(
                      tooltip: "Registrar pago",
                      onPressed: () => onRegisterPayment(client),
                      icon: const Icon(Icons.payments_outlined),
                    ),
                  ],
                ),
                onTap: () => onClientProfile(client),
              ),
            );
          },
        );
      },
    );
  }
}

class _RouteCard extends StatelessWidget {
  const _RouteCard({
    required this.route,
    required this.money,
    required this.isCollapsed,
    required this.visitedCollapsed,
    required this.onToggleCollapse,
    required this.onToggleVisitedCollapse,
    required this.onClientProfile,
    required this.onRegisterPayment,
    required this.onRenewCredit,
    required this.onReversePayment,
  });

  final CollectorRoute route;
  final NumberFormat money;
  final bool isCollapsed;
  final bool visitedCollapsed;
  final VoidCallback onToggleCollapse;
  final VoidCallback onToggleVisitedCollapse;
  final void Function(RouteClient client) onClientProfile;
  final void Function(RouteClient client) onRegisterPayment;
  final void Function(RouteClient client) onRenewCredit;
  final void Function(RouteClient client) onReversePayment;

  String _shiftLabel(String shift) => visitShiftLabel(shift);

  Widget _clientTile(
    BuildContext context,
    RouteClient client, {
    required bool visited,
  }) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: InkWell(
        onTap: () => onClientProfile(client),
        child: Text(
          client.fullName,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            color: Color(0xFF1A56DB),
          ),
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("${client.code} · ${client.visitStatus}"),
          CollectionStatusText(
            overdueCount: client.overdueInstallmentCount,
            isAhead: client.isAheadOnSchedule,
            overduePaidPct: client.overduePaidPct,
            aheadInstallmentPaidPct: client.aheadInstallmentPaidPct,
          ),
          if (client.renewedToday)
            Text(
              "Renovado hoy",
              style: TextStyle(
                color: Colors.amber.shade900,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          if (client.scheduledRenewalFor != null)
            Text(
              "Renovar hoy",
              style: TextStyle(
                color: Colors.blue.shade800,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
        ],
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(money.format(client.amountDue)),
          IconButton(
            tooltip: "Renovar crédito",
            onPressed: () => onRenewCredit(client),
            icon: Icon(
              Icons.autorenew,
              color: client.scheduledRenewalFor != null
                  ? Colors.blue.shade700
                  : null,
            ),
          ),
          if (visited) ...[
            IconButton(
              tooltip: "Otro pago",
              onPressed: () => onRegisterPayment(client),
              icon: const Icon(Icons.add_card_outlined),
            ),
            if (client.todayPaymentId != null)
              IconButton(
                tooltip: "Revertir pago",
                onPressed: () => onReversePayment(client),
                icon: const Icon(Icons.undo, color: Colors.red),
              ),
          ] else
            IconButton(
              tooltip: "Registrar pago",
              onPressed: () => onRegisterPayment(client),
              icon: const Icon(Icons.payments_outlined),
            ),
        ],
      ),
      onTap: () => onClientProfile(client),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pending = splitPendingClients(route.clients, (c) => c.visitStatus);
    final visited = splitVisitedClients(route.clients, (c) => c.visitStatus);

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            InkWell(
              onTap: onToggleCollapse,
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        route.name,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    Icon(
                      isCollapsed ? Icons.expand_more : Icons.expand_less,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              "${pending.length} pendientes · ${visited.length} visitados · turno ${_shiftLabel(route.shift)}",
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (route.collectedTodayPct != null) ...[
              const SizedBox(height: 8),
              LinearProgressIndicator(value: route.collectedTodayPct! / 100),
              Text("${route.collectedTodayPct!.toStringAsFixed(0)}% cobrado hoy"),
            ],
            if (!isCollapsed) ...[
              const Divider(height: 24),
              Text(
                "Pendientes de visita (${pending.length})",
                style: Theme.of(context).textTheme.labelLarge,
              ),
              if (pending.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text("No hay clientes pendientes."),
                )
              else
                ...pending.map(
                  (client) => _clientTile(context, client, visited: false),
                ),
              const SizedBox(height: 12),
              InkWell(
                onTap: onToggleVisitedCollapse,
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          "Clientes visitados (${visited.length})",
                          style: Theme.of(context).textTheme.labelLarge,
                        ),
                      ),
                      Text(
                        visitedCollapsed ? "Mostrar" : "Ocultar",
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Icon(
                        visitedCollapsed
                            ? Icons.expand_more
                            : Icons.expand_less,
                      ),
                    ],
                  ),
                ),
              ),
              if (!visitedCollapsed) ...[
                if (visited.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text("Aún no hay clientes visitados hoy."),
                  )
                else
                  ...visited.map(
                    (client) => _clientTile(context, client, visited: true),
                  ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}
