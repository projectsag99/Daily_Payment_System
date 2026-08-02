import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:intl/intl.dart";

import "../../core/network/api_error.dart";
import "../../data/models/pending_payment.dart";
import "../../data/models/route_models.dart";
import "../../providers/app_providers.dart";

class RecordPaymentScreen extends ConsumerStatefulWidget {
  const RecordPaymentScreen({super.key, required this.client});

  final RouteClient client;

  @override
  ConsumerState<RecordPaymentScreen> createState() =>
      _RecordPaymentScreenState();
}

class _RecordPaymentScreenState extends ConsumerState<RecordPaymentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  String _method = "cash";
  final _notesController = TextEditingController();
  bool _submitting = false;
  PendingPayment? _result;

  @override
  void initState() {
    super.initState();
    if (widget.client.amountDue > 0) {
      _amountController.text = widget.client.amountDue.toStringAsFixed(0);
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _result = null;
    });

    try {
      final repo = await ref.read(paymentRepositoryProvider.future);
      final amount = double.parse(_amountController.text.replaceAll(",", "."));
      final payment = await repo.recordPayment(
        clientId: widget.client.id,
        clientName: widget.client.fullName,
        amount: amount,
        paymentMethod: _method,
        notes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
      );
      ref.invalidate(pendingCountProvider);
      ref.invalidate(myRoutesProvider);
      setState(() => _result = payment);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e is ApiError ? e.message : "Error al registrar el pago",
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final money = NumberFormat.currency(locale: "es_CO", symbol: "\$", decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(title: Text(widget.client.fullName)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text("Código: ${widget.client.code}"),
              Text("Saldo sugerido: ${money.format(widget.client.amountDue)}"),
              const SizedBox(height: 24),
              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: "Monto",
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  final n = double.tryParse(v?.replaceAll(",", ".") ?? "");
                  if (n == null || n <= 0) return "Monto inválido";
                  return null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _method,
                decoration: const InputDecoration(
                  labelText: "Método de pago",
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: "cash", child: Text("Efectivo")),
                  DropdownMenuItem(value: "transfer", child: Text("Transferencia")),
                  DropdownMenuItem(value: "other", child: Text("Otro")),
                ],
                onChanged: (v) => setState(() => _method = v ?? "cash"),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _notesController,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: "Notas (opcional)",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _submitting ? null : _submit,
                child: Text(_submitting ? "Guardando…" : "Registrar pago"),
              ),
              if (_result != null) ...[
                const SizedBox(height: 24),
                _PaymentResultCard(payment: _result!),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _PaymentResultCard extends StatelessWidget {
  const _PaymentResultCard({required this.payment});

  final PendingPayment payment;

  @override
  Widget build(BuildContext context) {
    final color = switch (payment.status) {
      PendingPaymentStatus.synced => Colors.green,
      PendingPaymentStatus.pending => Colors.orange,
      PendingPaymentStatus.error || PendingPaymentStatus.conflict => Colors.red,
    };

    final label = switch (payment.status) {
      PendingPaymentStatus.synced => "Sincronizado con el servidor",
      PendingPaymentStatus.pending => "Guardado offline — pendiente de sync",
      PendingPaymentStatus.error => "Error: ${payment.errorMessage ?? "desconocido"}",
      PendingPaymentStatus.conflict => "Conflicto: ${payment.errorMessage ?? ""}",
    };

    return Card(
      color: color.withOpacity(0.08),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: color.shade700, fontWeight: FontWeight.w600)),
            if (payment.serverPaymentId != null)
              Text("ID pago: ${payment.serverPaymentId}"),
          ],
        ),
      ),
    );
  }
}

extension on Color {
  Color get shade700 {
    final hsl = HSLColor.fromColor(this);
    return hsl.withLightness((hsl.lightness - 0.15).clamp(0.0, 1.0)).toColor();
  }
}
