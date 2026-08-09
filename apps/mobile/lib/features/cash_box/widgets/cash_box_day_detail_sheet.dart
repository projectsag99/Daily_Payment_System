import "dart:typed_data";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";

import "../../../data/models/cash_box_models.dart";
import "../../../providers/app_providers.dart";
import "../cash_box_day_section.dart";

Future<void> showCashBoxDayDetailSheet(
  BuildContext context, {
  required String date,
  CashBoxDaySection? section,
  String? routeId,
  String? routeName,
  String? highlightExpenseId,
  Future<void> Function(String expenseId)? onDeleteExpense,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (context, scrollController) => _CashBoxDayDetailSheet(
        date: date,
        section: section,
        routeId: routeId,
        routeName: routeName,
        highlightExpenseId: highlightExpenseId,
        scrollController: scrollController,
        onDeleteExpense: onDeleteExpense,
      ),
    ),
  );
}

class _CashBoxDayDetailSheet extends ConsumerWidget {
  const _CashBoxDayDetailSheet({
    required this.date,
    required this.section,
    required this.routeId,
    required this.routeName,
    required this.highlightExpenseId,
    required this.scrollController,
    required this.onDeleteExpense,
  });

  final String date;
  final CashBoxDaySection? section;
  final String? routeId;
  final String? routeName;
  final String? highlightExpenseId;
  final ScrollController scrollController;
  final Future<void> Function(String expenseId)? onDeleteExpense;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailsAsync = ref.watch(
      cashBoxDayDetailsProvider((
        date,
        routeId,
        section?.apiValue,
      )),
    );
    final money =
        NumberFormat.currency(locale: "es_UY", symbol: "\$", decimalDigits: 0);
    final dateFmt = DateFormat("EEEE d/M/y", "es");
    final timeFmt = DateFormat("d/M/y HH:mm", "es");

    final parsed = DateTime.tryParse(date);
    final dateLabel = parsed != null ? dateFmt.format(parsed.toLocal()) : date;
    final title = _buildTitle(dateLabel);

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: detailsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text("Error: $e")),
        data: (details) {
          final showPayments =
              section == null || section == CashBoxDaySection.entradas;
          final showDisbursements =
              section == null || section == CashBoxDaySection.salidas;
          final showExpenses =
              section == null || section == CashBoxDaySection.office;

          return ListView(
            controller: scrollController,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 16),
              if (showPayments && details.payments.isNotEmpty) ...[
                _SectionTitle(
                  icon: Icons.payments_outlined,
                  title: "Cobros (${details.payments.length})",
                  color: Colors.green.shade700,
                ),
                ...details.payments.map(
                  (p) => _MovementTile(
                    title: p.clientName,
                    subtitle:
                        "${p.clientCode} · ${_formatTime(p.capturedAt, timeFmt)}",
                    amount: money.format(p.amount),
                    amountColor: Colors.green.shade800,
                  ),
                ),
                const SizedBox(height: 16),
              ],
              if (showDisbursements && details.renewals.isNotEmpty) ...[
                _SectionTitle(
                  icon: Icons.autorenew,
                  title: "Salidas (${details.renewals.length})",
                  color: Colors.orange.shade800,
                ),
                ...details.renewals.map(
                  (r) => _MovementTile(
                    title: r.clientName,
                    subtitle:
                        "${r.isOnboard ? "Préstamo nuevo" : "Renovación"} · "
                        "${r.clientCode} · ${_formatTime(r.createdAt, timeFmt)}",
                    amount: money.format(r.amount),
                    amountColor: Colors.orange.shade900,
                  ),
                ),
                const SizedBox(height: 16),
              ],
              if (showExpenses && details.expenses.isNotEmpty) ...[
                _SectionTitle(
                  icon: Icons.receipt_long_outlined,
                  title: "Gastos oficina / logística (${details.expenses.length})",
                  color: Colors.red.shade700,
                ),
                ...details.expenses.map(
                  (expense) => _ExpenseCard(
                    expense: expense,
                    money: money,
                    timeFmt: timeFmt,
                    highlighted: expense.id == highlightExpenseId,
                    onDelete: onDeleteExpense == null
                        ? null
                        : () => onDeleteExpense!(expense.id),
                  ),
                ),
              ],
              if ((showPayments && details.payments.isEmpty) &&
                  (showDisbursements && details.renewals.isEmpty) &&
                  (showExpenses && details.expenses.isEmpty))
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(child: Text("Sin movimientos en esta columna")),
                ),
            ],
          );
        },
      ),
    );
  }

  String _buildTitle(String dateLabel) {
    final routeSuffix =
        routeName != null && routeName!.isNotEmpty ? " · $routeName" : "";
    return switch (section) {
      CashBoxDaySection.entradas => "Entradas$routeSuffix · $dateLabel",
      CashBoxDaySection.salidas => "Salidas$routeSuffix · $dateLabel",
      CashBoxDaySection.office => "Oficina / logística · $dateLabel",
      null => dateLabel,
    };
  }

  static String _formatTime(String raw, DateFormat fmt) {
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    return fmt.format(parsed.toLocal());
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.icon,
    required this.title,
    required this.color,
  });

  final IconData icon;
  final String title;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: color,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }
}

class _MovementTile extends StatelessWidget {
  const _MovementTile({
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.amountColor,
  });

  final String title;
  final String subtitle;
  final String amount;
  final Color amountColor;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 6),
      child: ListTile(
        dense: true,
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
        trailing: Text(
          amount,
          style: TextStyle(fontWeight: FontWeight.bold, color: amountColor),
        ),
      ),
    );
  }
}

class _ExpenseCard extends ConsumerWidget {
  const _ExpenseCard({
    required this.expense,
    required this.money,
    required this.timeFmt,
    required this.highlighted,
    required this.onDelete,
  });

  final CashBoxDayExpense expense;
  final NumberFormat money;
  final DateFormat timeFmt;
  final bool highlighted;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: highlighted
            ? BorderSide(color: Colors.blue.shade400, width: 2)
            : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        expense.description,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                      if (expense.reportedAt != null)
                        Text(
                          "Reportado: ${_CashBoxDayDetailSheet._formatTime(expense.reportedAt!, timeFmt)}",
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      if (expense.routeName != null &&
                          expense.routeName!.isNotEmpty)
                        Text(
                          "Ruta: ${expense.routeName}",
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
                Text(
                  money.format(expense.amount),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.red.shade700,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            if (onDelete != null) ...[
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: onDelete,
                  child: const Text("Eliminar gasto"),
                ),
              ),
            ],
            if (expense.receipts.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                "Facturas (${expense.receipts.length})",
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
              const SizedBox(height: 8),
              ...expense.receipts.map(
                (receipt) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _ReceiptImage(
                    expenseId: expense.id,
                    receiptId: receipt.id,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ReceiptImage extends ConsumerStatefulWidget {
  const _ReceiptImage({
    required this.expenseId,
    required this.receiptId,
  });

  final String expenseId;
  final String receiptId;

  @override
  ConsumerState<_ReceiptImage> createState() => _ReceiptImageState();
}

class _ReceiptImageState extends ConsumerState<_ReceiptImage> {
  Uint8List? _bytes;
  bool _loading = true;
  bool _error = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ref.read(cashBoxApiProvider).fetchReceiptBytes(
            expenseId: widget.expenseId,
            receiptId: widget.receiptId,
          );
      if (!mounted) return;
      setState(() {
        _bytes = Uint8List.fromList(data);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = true;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Container(
        height: 120,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text("Cargando factura…", style: TextStyle(fontSize: 12)),
      );
    }
    if (_error || _bytes == null) {
      return Container(
        height: 80,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text("No se pudo cargar la imagen"),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: InteractiveViewer(
        minScale: 0.5,
        maxScale: 4,
        child: Image.memory(_bytes!, fit: BoxFit.contain),
      ),
    );
  }
}
