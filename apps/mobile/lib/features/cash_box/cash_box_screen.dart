import "dart:io";

import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";

import "../../core/network/api_error.dart";
import "../../data/models/cash_box_models.dart";
import "../../providers/app_providers.dart";
import "cash_box_day_section.dart";
import "widgets/cash_box_day_detail_sheet.dart";
import "widgets/cash_box_spreadsheet_view.dart";
import "widgets/expense_receipt_capture_section.dart";

class CashBoxScreen extends ConsumerStatefulWidget {
  const CashBoxScreen({super.key});

  static const routeName = "/cash-box";

  @override
  ConsumerState<CashBoxScreen> createState() => _CashBoxScreenState();
}

class _CashBoxScreenState extends ConsumerState<CashBoxScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  String? _selectedRouteId;
  late String _selectedMonth;
  final _expenseFormKey = GlobalKey<FormState>();
  final _expenseAmountController = TextEditingController();
  final _expenseDescriptionController = TextEditingController();
  String? _expenseRouteId;
  bool _expenseRouteManuallySet = false;
  DateTime _expenseDate = DateTime.now();
  bool _submittingExpense = false;
  List<File> _receiptPhotos = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _selectedMonth = DateFormat("yyyy-MM").format(DateTime.now());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _expenseAmountController.dispose();
    _expenseDescriptionController.dispose();
    super.dispose();
  }

  String _isoDate(DateTime date) => DateFormat("yyyy-MM-dd").format(date);

  void _invalidateCashBoxData() {
    ref.invalidate(cashBoxSummaryProvider(_selectedRouteId));
    ref.invalidate(cashBoxSpreadsheetProvider(_selectedMonth));
    ref.invalidate(cashBoxDayDetailsProvider);
  }

  Future<void> _refreshAll() async {
    _invalidateCashBoxData();
    await Future.wait([
      ref.read(cashBoxSummaryProvider(_selectedRouteId).future),
      ref.read(cashBoxSpreadsheetProvider(_selectedMonth).future),
    ]);
  }

  void _syncExpenseRoute(List<CashBoxRouteOption> routes) {
    if (routes.isEmpty) return;
    if (_expenseRouteManuallySet) {
      if (_expenseRouteId != null &&
          !routes.any((route) => route.id == _expenseRouteId)) {
        _expenseRouteId = null;
      }
      return;
    }
    if (routes.length == 1) {
      _expenseRouteId = routes.first.id;
      return;
    }
    _expenseRouteId = _selectedRouteId;
  }

  Future<void> _pickExpenseDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _expenseDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked != null) {
      setState(() => _expenseDate = picked);
    }
  }

  Future<void> _submitExpense(List<CashBoxRouteOption> routes) async {
    if (!_expenseFormKey.currentState!.validate()) return;
    if (routes.isEmpty) return;

    final routeId = routes.length == 1 && !_expenseRouteManuallySet
        ? routes.first.id
        : (_expenseRouteId != null && _expenseRouteId!.isNotEmpty
            ? _expenseRouteId
            : null);

    final amount = double.tryParse(_expenseAmountController.text.trim());
    if (amount == null || amount <= 0) return;

    setState(() => _submittingExpense = true);
    try {
      await ref.read(cashBoxApiProvider).createExpense(
            expenseDate: _isoDate(_expenseDate),
            amount: amount,
            description: _expenseDescriptionController.text.trim(),
            routeId: routeId,
            receiptPhotos: _receiptPhotos,
          );

      _expenseAmountController.clear();
      _expenseDescriptionController.clear();
      setState(() {
        _expenseDate = DateTime.now();
        _receiptPhotos = [];
        _expenseRouteManuallySet = false;
      });
      await _refreshAll();

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Gasto registrado")),
      );
    } on ApiError catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString().replaceFirst("Exception: ", ""))),
      );
    } finally {
      if (mounted) setState(() => _submittingExpense = false);
    }
  }

  Future<void> _deleteExpense(String expenseId, String date) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Quitar gasto"),
        content: const Text("¿Eliminar este gasto de logística?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("Cancelar"),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text("Eliminar"),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(cashBoxApiProvider).deleteExpense(expenseId);
      await _refreshAll();
      if (!mounted) return;
      Navigator.of(context).maybePop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Gasto eliminado")),
      );
    } on ApiError catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message)),
      );
    }
  }

  void _shiftMonth(int delta) {
    final parsed = DateTime.tryParse("$_selectedMonth-01");
    if (parsed == null) return;
    final next = DateTime(parsed.year, parsed.month + delta);
    setState(() => _selectedMonth = DateFormat("yyyy-MM").format(next));
  }

  void _openColumnDetail({
    required String date,
    CashBoxDaySection? section,
    String? routeId,
    String? routeName,
    String? highlightExpenseId,
  }) {
    showCashBoxDayDetailSheet(
      context,
      date: date,
      section: section,
      routeId: routeId,
      routeName: routeName,
      highlightExpenseId: highlightExpenseId,
      onDeleteExpense: (expenseId) => _deleteExpense(expenseId, date),
    );
  }

  @override
  Widget build(BuildContext context) {
    final summaryAsync = ref.watch(cashBoxSummaryProvider(_selectedRouteId));
    final spreadsheetAsync = ref.watch(cashBoxSpreadsheetProvider(_selectedMonth));
    final money = NumberFormat.currency(locale: "es_UY", symbol: "\$", decimalDigits: 0);
    final dateFmt = DateFormat("d/M/y", "es");
    final expenseDateFmt = DateFormat("d/M/y", "es");
    final monthLabel = _formatMonthLabel(_selectedMonth);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Mi caja"),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.table_chart_outlined), text: "Planilla"),
            Tab(icon: Icon(Icons.list_alt), text: "Movimientos"),
            Tab(icon: Icon(Icons.receipt_long_outlined), text: "Gastos"),
          ],
        ),
      ),
      body: summaryAsync.when(
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
                  onPressed: _refreshAll,
                  child: const Text("Reintentar"),
                ),
              ],
            ),
          ),
        ),
        data: (summary) {
          _syncExpenseRoute(summary.routes);

          return TabBarView(
            controller: _tabController,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              _PlanillaTab(
                spreadsheetAsync: spreadsheetAsync,
                monthLabel: monthLabel,
                money: money,
                onPrevMonth: () => _shiftMonth(-1),
                onNextMonth: () => _shiftMonth(1),
                onRefresh: _refreshAll,
                onOpenColumn: ({
                  required date,
                  required section,
                  routeId,
                  routeName,
                  expenseId,
                }) =>
                    _openColumnDetail(
                  date: date,
                  section: section,
                  routeId: routeId,
                  routeName: routeName,
                  highlightExpenseId: expenseId,
                ),
              ),
              _MovimientosTab(
                summary: summary,
                money: money,
                dateFmt: dateFmt,
                selectedRouteId: _selectedRouteId,
                onRouteChanged: (value) => setState(() => _selectedRouteId = value),
                onRefresh: _refreshAll,
                onOpenDay: (date) => _openColumnDetail(date: date),
              ),
              _GastosTab(
                summary: summary,
                formKey: _expenseFormKey,
                expenseRouteId: _expenseRouteId,
                expenseDateLabel: expenseDateFmt.format(_expenseDate),
                amountController: _expenseAmountController,
                descriptionController: _expenseDescriptionController,
                receiptPhotos: _receiptPhotos,
                submitting: _submittingExpense,
                onPickDate: _pickExpenseDate,
                onRouteChanged: (value) => setState(() {
                  _expenseRouteId = value;
                  _expenseRouteManuallySet = true;
                }),
                onReceiptPhotosChanged: (photos) =>
                    setState(() => _receiptPhotos = photos),
                onSubmit: () => _submitExpense(summary.routes),
                onRefresh: _refreshAll,
              ),
            ],
          );
        },
      ),
    );
  }

  static String _routeLabel(CashBoxRouteOption route) {
    final shift = switch (route.shift) {
      "morning" => "Mañana",
      "afternoon" => "Tarde",
      "evening" => "Noche",
      _ => route.shift,
    };
    return "${route.name} ($shift)";
  }

  static String _formatDate(String raw, DateFormat fmt) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw.length >= 10 ? raw.substring(0, 10) : raw;
    return fmt.format(parsed.toLocal());
  }

  static String _formatMonthLabel(String month) {
    final parsed = DateTime.tryParse("$month-01");
    if (parsed == null) return month;
    return DateFormat("MMMM yyyy", "es").format(parsed);
  }
}

class _PlanillaTab extends StatelessWidget {
  const _PlanillaTab({
    required this.spreadsheetAsync,
    required this.monthLabel,
    required this.money,
    required this.onPrevMonth,
    required this.onNextMonth,
    required this.onRefresh,
    required this.onOpenColumn,
  });

  final AsyncValue<CashBoxSpreadsheet> spreadsheetAsync;
  final String monthLabel;
  final NumberFormat money;
  final VoidCallback onPrevMonth;
  final VoidCallback onNextMonth;
  final Future<void> Function() onRefresh;
  final CashBoxColumnTap onOpenColumn;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: onPrevMonth,
                        icon: const Icon(Icons.chevron_left),
                        tooltip: "Mes anterior",
                      ),
                      Expanded(
                        child: Text(
                          monthLabel,
                          textAlign: TextAlign.center,
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                        ),
                      ),
                      IconButton(
                        onPressed: onNextMonth,
                        icon: const Icon(Icons.chevron_right),
                        tooltip: "Mes siguiente",
                      ),
                      IconButton(
                        onPressed: onRefresh,
                        icon: const Icon(Icons.refresh),
                        tooltip: "Actualizar",
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: spreadsheetAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text("No se pudo cargar la planilla: $e"),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: onRefresh,
                      child: const Text("Reintentar"),
                    ),
                  ],
                ),
              ),
              data: (spreadsheet) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _CompactSummaryTile(
                            label: "Base inicial",
                            value: money.format(spreadsheet.initialBalance),
                            color: Colors.blueGrey.shade50,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _CompactSummaryTile(
                            label: "Total en caja",
                            value: money.format(spreadsheet.totalEnCaja),
                            color: Colors.green.shade50,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Un dedo: desplazar · Dos dedos: zoom · Toca una celda con monto "
                      "para ver el detalle de esa columna.",
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: CashBoxSpreadsheetView(
                        data: spreadsheet,
                        money: money,
                        onOpenColumn: onOpenColumn,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _MovimientosTab extends StatelessWidget {
  const _MovimientosTab({
    required this.summary,
    required this.money,
    required this.dateFmt,
    required this.selectedRouteId,
    required this.onRouteChanged,
    required this.onRefresh,
    required this.onOpenDay,
  });

  final CashBoxSummary summary;
  final NumberFormat money;
  final DateFormat dateFmt;
  final String? selectedRouteId;
  final ValueChanged<String?> onRouteChanged;
  final Future<void> Function() onRefresh;
  final void Function(String date) onOpenDay;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (summary.routes.length > 1) ...[
            DropdownButtonFormField<String?>(
              initialValue: selectedRouteId,
              decoration: const InputDecoration(
                labelText: "Ruta",
                border: OutlineInputBorder(),
              ),
              items: [
                const DropdownMenuItem<String?>(
                  value: null,
                  child: Text("Todas las rutas"),
                ),
                ...summary.routes.map(
                  (route) => DropdownMenuItem<String?>(
                    value: route.id,
                    child: Text(_CashBoxScreenState._routeLabel(route)),
                  ),
                ),
              ],
              onChanged: onRouteChanged,
            ),
            const SizedBox(height: 16),
          ] else if (summary.routes.length == 1) ...[
            Text(
              "Ruta: ${_CashBoxScreenState._routeLabel(summary.routes.first)}",
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
          ],
          _SummaryGrid(summary: summary.summary, money: money),
          const SizedBox(height: 8),
          Text(
            "Periodo: ${_CashBoxScreenState._formatDate(summary.from, dateFmt)} – "
            "${_CashBoxScreenState._formatDate(summary.to, dateFmt)}",
            style: Theme.of(context).textTheme.bodySmall,
          ),
          if (summary.periodStart != null)
            Text(
              "Inicio de periodo: "
              "${_CashBoxScreenState._formatDate(summary.periodStart!, dateFmt)}",
              style: Theme.of(context).textTheme.bodySmall,
            ),
          const SizedBox(height: 20),
          Text(
            "Movimientos por día",
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            "Toca un día para ver cobros, renovaciones, gastos y facturas.",
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          if (summary.days.isEmpty)
            const Text("Sin movimientos en este periodo.")
          else
            ...summary.days.map(
              (day) => _DayCard(
                day: day,
                money: money,
                dateFmt: dateFmt,
                onTap: () => onOpenDay(day.date),
              ),
            ),
        ],
      ),
    );
  }
}

class _GastosTab extends StatelessWidget {
  const _GastosTab({
    required this.summary,
    required this.formKey,
    required this.expenseRouteId,
    required this.expenseDateLabel,
    required this.amountController,
    required this.descriptionController,
    required this.receiptPhotos,
    required this.submitting,
    required this.onPickDate,
    required this.onRouteChanged,
    required this.onReceiptPhotosChanged,
    required this.onSubmit,
    required this.onRefresh,
  });

  final CashBoxSummary summary;
  final GlobalKey<FormState> formKey;
  final String? expenseRouteId;
  final String expenseDateLabel;
  final TextEditingController amountController;
  final TextEditingController descriptionController;
  final List<File> receiptPhotos;
  final bool submitting;
  final VoidCallback onPickDate;
  final ValueChanged<String?> onRouteChanged;
  final ValueChanged<List<File>> onReceiptPhotosChanged;
  final VoidCallback onSubmit;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _SummaryGrid(summary: summary.summary, money: money),
          const SizedBox(height: 20),
          _ExpenseFormCard(
            formKey: formKey,
            routes: summary.routes,
            expenseRouteId: expenseRouteId,
            expenseDateLabel: expenseDateLabel,
            amountController: amountController,
            descriptionController: descriptionController,
            receiptPhotos: receiptPhotos,
            submitting: submitting,
            onPickDate: onPickDate,
            onRouteChanged: onRouteChanged,
            onReceiptPhotosChanged: onReceiptPhotosChanged,
            onSubmit: onSubmit,
          ),
        ],
      ),
    );
  }

  NumberFormat get money =>
      NumberFormat.currency(locale: "es_UY", symbol: "\$", decimalDigits: 0);
}

class _CompactSummaryTile extends StatelessWidget {
  const _CompactSummaryTile({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }
}

class _DayCard extends StatelessWidget {
  const _DayCard({
    required this.day,
    required this.money,
    required this.dateFmt,
    required this.onTap,
  });

  final CashBoxDaySummary day;
  final NumberFormat money;
  final DateFormat dateFmt;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _formatDate(day.date, dateFmt),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Cobrado ${money.format(day.collected)} · "
                      "${day.paymentsCount} pagos",
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      "Renov. ${money.format(day.renewalsOut)} · "
                      "Gastos ${money.format(day.expensesTotal)}",
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    money.format(day.dailyNet),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: day.dailyNet >= 0
                          ? Colors.green.shade800
                          : Colors.red.shade700,
                    ),
                  ),
                  Text(
                    "Neto",
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  Icon(Icons.chevron_right, color: Colors.grey.shade600),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _formatDate(String raw, DateFormat fmt) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw.length >= 10 ? raw.substring(0, 10) : raw;
    return fmt.format(parsed.toLocal());
  }
}

class _ExpenseFormCard extends StatelessWidget {
  const _ExpenseFormCard({
    required this.formKey,
    required this.routes,
    required this.expenseRouteId,
    required this.expenseDateLabel,
    required this.amountController,
    required this.descriptionController,
    required this.receiptPhotos,
    required this.submitting,
    required this.onPickDate,
    required this.onRouteChanged,
    required this.onReceiptPhotosChanged,
    required this.onSubmit,
  });

  final GlobalKey<FormState> formKey;
  final List<CashBoxRouteOption> routes;
  final String? expenseRouteId;
  final String expenseDateLabel;
  final TextEditingController amountController;
  final TextEditingController descriptionController;
  final List<File> receiptPhotos;
  final bool submitting;
  final VoidCallback onPickDate;
  final ValueChanged<String?> onRouteChanged;
  final ValueChanged<List<File>> onReceiptPhotosChanged;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Gastos logísticos / salida oficina",
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 4),
              Text(
                "Combustible, peajes, arriendo y otros gastos operativos. "
                "Se suman en la columna «Salida oficina / logística».",
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              if (routes.length > 1) ...[
                DropdownButtonFormField<String?>(
                  value: expenseRouteId,
                  decoration: const InputDecoration(
                    labelText: "Ruta (opcional)",
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null,
                      child: Text("Sin ruta específica"),
                    ),
                    ...routes.map(
                      (route) => DropdownMenuItem<String?>(
                        value: route.id,
                        child: Text(_CashBoxScreenState._routeLabel(route)),
                      ),
                    ),
                  ],
                  onChanged: submitting ? null : onRouteChanged,
                ),
                const SizedBox(height: 12),
              ],
              InkWell(
                onTap: submitting ? null : onPickDate,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: "Fecha *",
                    border: OutlineInputBorder(),
                  ),
                  child: Text(expenseDateLabel),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: amountController,
                decoration: const InputDecoration(
                  labelText: "Valor (\$) *",
                  border: OutlineInputBorder(),
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r"^\d*\.?\d{0,2}")),
                ],
                validator: (value) {
                  final amount = double.tryParse((value ?? "").trim());
                  if (amount == null || amount <= 0) {
                    return "Ingresa un monto válido";
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: "Descripción *",
                  hintText: "Ej.: Combustible ruta mañana",
                  border: OutlineInputBorder(),
                ),
                maxLength: 500,
                validator: (value) =>
                    (value == null || value.trim().isEmpty) ? "Requerido" : null,
              ),
              const SizedBox(height: 16),
              ExpenseReceiptCaptureSection(
                photos: receiptPhotos,
                enabled: !submitting,
                onChanged: onReceiptPhotosChanged,
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  onPressed: submitting || routes.isEmpty ? null : onSubmit,
                  child: Text(submitting ? "Guardando…" : "Agregar gasto"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({required this.summary, required this.money});

  final CashBoxSummaryTotals summary;
  final NumberFormat money;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _SummaryTile(
                label: "Base inicial",
                value: money.format(summary.initialBalance),
                color: Colors.blueGrey.shade50,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _SummaryTile(
                label: "Total cobrado",
                value: money.format(summary.totalCollected),
                color: Colors.green.shade50,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _SummaryTile(
                label: "Renovaciones",
                value: money.format(summary.totalRenewalsOut),
                color: Colors.orange.shade50,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _SummaryTile(
                label: "Gastos",
                value: money.format(summary.totalExpenses),
                color: Colors.red.shade50,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _SummaryTile(
          label: "Saldo en caja",
          value: money.format(summary.accumulatedBalance),
          color: Colors.blue.shade50,
        ),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  const _SummaryTile({
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }
}
