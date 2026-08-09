import "package:flutter/material.dart";
import "package:intl/intl.dart";

import "../../../data/models/cash_box_models.dart";
import "../cash_box_day_section.dart";

const _routePalettes = <({Color entradas, Color salidas})>[
  (entradas: Color(0xFF2563EB), salidas: Color(0xFF1D4ED8)),
  (entradas: Color(0xFF22C55E), salidas: Color(0xFF16A34A)),
  (entradas: Color(0xFF7C3AED), salidas: Color(0xFF6D28D9)),
  (entradas: Color(0xFFF97316), salidas: Color(0xFFEA580C)),
];

typedef CashBoxColumnTap = void Function({
  required String date,
  required CashBoxDaySection section,
  String? routeId,
  String? routeName,
  String? expenseId,
});

class CashBoxSpreadsheetView extends StatefulWidget {
  const CashBoxSpreadsheetView({
    super.key,
    required this.data,
    required this.money,
    required this.onOpenColumn,
  });

  final CashBoxSpreadsheet data;
  final NumberFormat money;
  final CashBoxColumnTap onOpenColumn;

  @override
  State<CashBoxSpreadsheetView> createState() => _CashBoxSpreadsheetViewState();
}

class _CashBoxSpreadsheetViewState extends State<CashBoxSpreadsheetView> {
  final _horizontalScrollController = ScrollController();
  final _verticalScrollController = ScrollController();
  double _scale = 1.0;

  static const _fixedWidth = 72.0;
  static const _baseWidth = 88.0;
  static const _routeColWidth = 80.0;
  static const _officeWidth = 88.0;
  static const _specWidth = 160.0;
  static const _rowHeight = 36.0;
  static const _titleHeight = 48.0;

  double get _tableWidth =>
      _fixedWidth * 2 +
      _baseWidth +
      _routeColWidth * widget.data.routes.length * 2 +
      _officeWidth +
      _specWidth;

  double get _tableHeight =>
      _titleHeight + _rowHeight * (widget.data.rows.length + 2);

  void _zoomBy(double delta) {
    setState(() {
      _scale = (_scale + delta).clamp(0.6, 2.8);
    });
  }

  void _resetZoom() {
    setState(() => _scale = 1.0);
  }

  String _cellAmount(double value) =>
      value > 0 ? widget.money.format(value) : "";

  @override
  void dispose() {
    _horizontalScrollController.dispose();
    _verticalScrollController.dispose();
    super.dispose();
  }

  Widget _buildTable(List<CashBoxRouteOption> routes) {
    return SizedBox(
      width: _tableWidth,
      height: _tableHeight,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: _titleHeight,
            color: const Color(0xFF6D28D9),
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              widget.data.title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
          _HeaderRow(routes: routes),
          ...widget.data.rows.map(
            (row) => _DataRowWidget(
              row: row,
              routes: routes,
              money: widget.money,
              cellAmount: _cellAmount,
              onOpenColumn: widget.onOpenColumn,
            ),
          ),
          _FooterRow(
            totalEnCaja: widget.data.totalEnCaja,
            money: widget.money,
            routesCount: routes.length,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final routes = widget.data.routes;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
            child: Row(
              children: [
                IconButton(
                  tooltip: "Alejar",
                  visualDensity: VisualDensity.compact,
                  onPressed: () => _zoomBy(-0.2),
                  icon: const Icon(Icons.remove),
                ),
                Text("${(_scale * 100).round()}%"),
                IconButton(
                  tooltip: "Acercar",
                  visualDensity: VisualDensity.compact,
                  onPressed: () => _zoomBy(0.2),
                  icon: const Icon(Icons.add),
                ),
                const Spacer(),
                TextButton(onPressed: _resetZoom, child: const Text("100%")),
              ],
            ),
          ),
          Expanded(
            child: Scrollbar(
              controller: _verticalScrollController,
              thumbVisibility: true,
              child: SingleChildScrollView(
                controller: _verticalScrollController,
                primary: false,
                child: Scrollbar(
                  controller: _horizontalScrollController,
                  thumbVisibility: true,
                  notificationPredicate: (_) => true,
                  child: SingleChildScrollView(
                    controller: _horizontalScrollController,
                    primary: false,
                    scrollDirection: Axis.horizontal,
                    child: Transform.scale(
                      scale: _scale,
                      alignment: Alignment.topLeft,
                      child: _buildTable(routes),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderRow extends StatelessWidget {
  const _HeaderRow({required this.routes});

  final List<CashBoxRouteOption> routes;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _CashBoxSpreadsheetViewState._rowHeight,
      child: Row(
        children: [
          _HeaderCell("Día", width: _CashBoxSpreadsheetViewState._fixedWidth, bg: Colors.yellow.shade300),
          _HeaderCell("Fecha", width: _CashBoxSpreadsheetViewState._fixedWidth, bg: Colors.yellow.shade300),
          _HeaderCell("Base", width: _CashBoxSpreadsheetViewState._baseWidth, bg: const Color(0xFFA21CAF), fg: Colors.white),
          ...routes.asMap().entries.map((entry) {
            final palette = _routePalettes[entry.key % _routePalettes.length];
            return _HeaderCell(
              "Ent.\n${entry.value.name}",
              width: _CashBoxSpreadsheetViewState._routeColWidth,
              bg: palette.entradas,
              fg: Colors.white,
              small: true,
            );
          }),
          ...routes.asMap().entries.map((entry) {
            final palette = _routePalettes[entry.key % _routePalettes.length];
            return _HeaderCell(
              "Sal.\n${entry.value.name}",
              width: _CashBoxSpreadsheetViewState._routeColWidth,
              bg: palette.salidas,
              fg: Colors.white,
              small: true,
            );
          }),
          _HeaderCell(
            "Oficina\n/ logística",
            width: _CashBoxSpreadsheetViewState._officeWidth,
            bg: Colors.yellow.shade300,
            small: true,
          ),
          _HeaderCell(
            "Especificación",
            width: _CashBoxSpreadsheetViewState._specWidth,
            bg: Colors.cyan.shade300,
            small: true,
          ),
        ],
      ),
    );
  }
}

class _HeaderCell extends StatelessWidget {
  const _HeaderCell(
    this.label, {
    required this.width,
    required this.bg,
    this.fg = Colors.black87,
    this.small = false,
  });

  final String label;
  final double width;
  final Color bg;
  final Color fg;
  final bool small;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: Colors.grey.shade400, width: 0.5),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: fg,
          fontSize: small ? 9 : 10,
          fontWeight: FontWeight.w700,
          height: 1.2,
        ),
      ),
    );
  }
}

class _DataRowWidget extends StatelessWidget {
  const _DataRowWidget({
    required this.row,
    required this.routes,
    required this.money,
    required this.cellAmount,
    required this.onOpenColumn,
  });

  final CashBoxSpreadsheetRow row;
  final List<CashBoxRouteOption> routes;
  final NumberFormat money;
  final String Function(double) cellAmount;
  final CashBoxColumnTap onOpenColumn;

  @override
  Widget build(BuildContext context) {
    final inactive = row.inactive;
    final rowBg = inactive ? Colors.cyan.shade100 : Colors.white;
    final dayBg = inactive ? Colors.cyan.shade100 : Colors.yellow.shade50;

    return Container(
      height: _CashBoxSpreadsheetViewState._rowHeight,
      color: rowBg,
      child: Row(
        children: [
          _BodyCell(row.dayName, width: _CashBoxSpreadsheetViewState._fixedWidth, bg: dayBg, bold: true),
          _BodyCell(row.dateLabel, width: _CashBoxSpreadsheetViewState._fixedWidth, bg: dayBg),
          _BodyCell(
            money.format(row.base),
            width: _CashBoxSpreadsheetViewState._baseWidth,
            bg: Colors.purple.shade50,
            alignRight: true,
            bold: true,
          ),
          ...routes.asMap().entries.map((entry) {
            final route = entry.value;
            final amount = row.entradas[route.id] ?? 0;
            return _TappableBodyCell(
              text: cellAmount(amount),
              width: _CashBoxSpreadsheetViewState._routeColWidth,
              alignRight: true,
              enabled: !inactive,
              onTap: () => onOpenColumn(
                date: row.date,
                section: CashBoxDaySection.entradas,
                routeId: route.id,
                routeName: route.name,
              ),
            );
          }),
          ...routes.asMap().entries.map((entry) {
            final route = entry.value;
            final amount = row.salidas[route.id] ?? 0;
            return _TappableBodyCell(
              text: cellAmount(amount),
              width: _CashBoxSpreadsheetViewState._routeColWidth,
              alignRight: true,
              enabled: !inactive,
              onTap: () => onOpenColumn(
                date: row.date,
                section: CashBoxDaySection.salidas,
                routeId: route.id,
                routeName: route.name,
              ),
            );
          }),
          _TappableBodyCell(
            text: cellAmount(row.salidaOficina),
            width: _CashBoxSpreadsheetViewState._officeWidth,
            bg: Colors.yellow.shade50,
            alignRight: true,
            enabled: !inactive,
            onTap: () => onOpenColumn(
              date: row.date,
              section: CashBoxDaySection.office,
            ),
          ),
          SizedBox(
            width: _CashBoxSpreadsheetViewState._specWidth,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.cyan.shade50,
                border: Border.all(color: Colors.grey.shade400, width: 0.5),
              ),
              padding: const EdgeInsets.all(4),
              child: row.dayExpenses.isEmpty
                  ? Text(row.especificacion, style: const TextStyle(fontSize: 10))
                  : Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: row.dayExpenses.map((expense) {
                        final label = expense.receiptCount > 0
                            ? "${expense.description} (${expense.receiptCount}📷)"
                            : expense.description;
                        return GestureDetector(
                          onTap: () => onOpenColumn(
                            date: row.date,
                            section: CashBoxDaySection.office,
                            expenseId: expense.id,
                          ),
                          child: Text(
                            label,
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.blue.shade800,
                              decoration: TextDecoration.underline,
                            ),
                          ),
                        );
                      }).toList(),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BodyCell extends StatelessWidget {
  const _BodyCell(
    this.text, {
    required this.width,
    this.bg,
    this.alignRight = false,
    this.bold = false,
  });

  final String text;
  final double width;
  final Color? bg;
  final bool alignRight;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      alignment: alignRight ? Alignment.centerRight : Alignment.centerLeft,
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: Colors.grey.shade400, width: 0.5),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: bold ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
    );
  }
}

class _TappableBodyCell extends StatelessWidget {
  const _TappableBodyCell({
    required this.text,
    required this.width,
    required this.onTap,
    this.bg,
    this.alignRight = false,
    this.enabled = true,
  });

  final String text;
  final double width;
  final VoidCallback onTap;
  final Color? bg;
  final bool alignRight;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final child = _BodyCell(
      text,
      width: width,
      bg: enabled ? bg : bg ?? Colors.grey.shade50,
      alignRight: alignRight,
      bold: enabled && text.isNotEmpty,
    );

    if (!enabled) return child;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: child,
    );
  }
}

class _FooterRow extends StatelessWidget {
  const _FooterRow({
    required this.totalEnCaja,
    required this.money,
    required this.routesCount,
  });

  final double totalEnCaja;
  final NumberFormat money;
  final int routesCount;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: _CashBoxSpreadsheetViewState._rowHeight,
      child: Row(
        children: [
          _BodyCell(
            "Total en caja",
            width: _CashBoxSpreadsheetViewState._fixedWidth * 2,
            bg: Colors.green.shade200,
            bold: true,
          ),
          _BodyCell(
            money.format(totalEnCaja),
            width: _CashBoxSpreadsheetViewState._baseWidth,
            bg: Colors.purple.shade100,
            alignRight: true,
            bold: true,
          ),
          _BodyCell(
            "",
            width: _CashBoxSpreadsheetViewState._routeColWidth *
                    routesCount *
                    2 +
                _CashBoxSpreadsheetViewState._officeWidth +
                _CashBoxSpreadsheetViewState._specWidth,
            bg: Colors.green.shade200,
          ),
        ],
      ),
    );
  }
}
