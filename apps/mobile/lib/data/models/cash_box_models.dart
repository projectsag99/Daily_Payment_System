class CashBoxDaySummary {
  const CashBoxDaySummary({
    required this.date,
    required this.collected,
    required this.paymentsCount,
    required this.renewalsOut,
    required this.expensesTotal,
    required this.dailyNet,
    required this.accumulatedBalance,
  });

  final String date;
  final double collected;
  final int paymentsCount;
  final double renewalsOut;
  final double expensesTotal;
  final double dailyNet;
  final double accumulatedBalance;

  factory CashBoxDaySummary.fromJson(Map<String, dynamic> json) {
    return CashBoxDaySummary(
      date: json["date"] as String,
      collected: (json["collected"] as num).toDouble(),
      paymentsCount: json["paymentsCount"] as int,
      renewalsOut: (json["renewalsOut"] as num).toDouble(),
      expensesTotal: (json["expensesTotal"] as num).toDouble(),
      dailyNet: (json["dailyNet"] as num).toDouble(),
      accumulatedBalance: (json["accumulatedBalance"] as num).toDouble(),
    );
  }
}

class CashBoxRouteOption {
  const CashBoxRouteOption({
    required this.id,
    required this.name,
    required this.shift,
  });

  final String id;
  final String name;
  final String shift;

  factory CashBoxRouteOption.fromJson(Map<String, dynamic> json) {
    return CashBoxRouteOption(
      id: json["id"] as String,
      name: json["name"] as String,
      shift: json["shift"] as String,
    );
  }
}

class CashBoxSummaryTotals {
  const CashBoxSummaryTotals({
    required this.initialBalance,
    required this.totalCollected,
    required this.totalRenewalsOut,
    required this.totalExpenses,
    required this.accumulatedBalance,
  });

  final double initialBalance;
  final double totalCollected;
  final double totalRenewalsOut;
  final double totalExpenses;
  final double accumulatedBalance;

  factory CashBoxSummaryTotals.fromJson(Map<String, dynamic> json) {
    return CashBoxSummaryTotals(
      initialBalance: (json["initialBalance"] as num).toDouble(),
      totalCollected: (json["totalCollected"] as num).toDouble(),
      totalRenewalsOut: (json["totalRenewalsOut"] as num).toDouble(),
      totalExpenses: (json["totalExpenses"] as num).toDouble(),
      accumulatedBalance: (json["accumulatedBalance"] as num).toDouble(),
    );
  }
}

class CashBoxSummary {
  const CashBoxSummary({
    required this.from,
    required this.to,
    required this.summary,
    required this.days,
    required this.routes,
    this.periodStart,
  });

  final String from;
  final String to;
  final CashBoxSummaryTotals summary;
  final List<CashBoxDaySummary> days;
  final List<CashBoxRouteOption> routes;
  final String? periodStart;

  factory CashBoxSummary.fromJson(Map<String, dynamic> json) {
    final daysJson = json["days"] as List<dynamic>? ?? [];
    final routesJson = json["routes"] as List<dynamic>? ?? [];
    return CashBoxSummary(
      from: json["from"] as String,
      to: json["to"] as String,
      periodStart: json["periodStart"] as String?,
      summary: CashBoxSummaryTotals.fromJson(
        json["summary"] as Map<String, dynamic>,
      ),
      days: daysJson
          .map((e) => CashBoxDaySummary.fromJson(e as Map<String, dynamic>))
          .toList(),
      routes: routesJson
          .map((e) => CashBoxRouteOption.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CashBoxDayDetails {
  const CashBoxDayDetails({
    required this.date,
    required this.payments,
    required this.renewals,
    required this.expenses,
  });

  final String date;
  final List<CashBoxDayPayment> payments;
  final List<CashBoxDayRenewal> renewals;
  final List<CashBoxDayExpense> expenses;

  factory CashBoxDayDetails.fromJson(Map<String, dynamic> json) {
    final paymentsJson = json["payments"] as List<dynamic>? ?? [];
    final renewalsJson = json["renewals"] as List<dynamic>? ?? [];
    final expensesJson = json["expenses"] as List<dynamic>? ?? [];
    return CashBoxDayDetails(
      date: json["date"] as String,
      payments: paymentsJson
          .map((e) => CashBoxDayPayment.fromJson(e as Map<String, dynamic>))
          .toList(),
      renewals: renewalsJson
          .map((e) => CashBoxDayRenewal.fromJson(e as Map<String, dynamic>))
          .toList(),
      expenses: expensesJson
          .map((e) => CashBoxDayExpense.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CashBoxDayPayment {
  const CashBoxDayPayment({
    required this.id,
    required this.amount,
    required this.capturedAt,
    required this.clientCode,
    required this.clientName,
  });

  final String id;
  final double amount;
  final String capturedAt;
  final String clientCode;
  final String clientName;

  factory CashBoxDayPayment.fromJson(Map<String, dynamic> json) {
    return CashBoxDayPayment(
      id: json["id"] as String,
      amount: (json["amount"] as num).toDouble(),
      capturedAt: json["capturedAt"] as String,
      clientCode: json["clientCode"] as String,
      clientName: json["clientName"] as String,
    );
  }
}

class CashBoxDayRenewal {
  const CashBoxDayRenewal({
    required this.id,
    required this.amount,
    required this.createdAt,
    required this.clientCode,
    required this.clientName,
    this.kind = "renewal",
  });

  final String id;
  final double amount;
  final String createdAt;
  final String clientCode;
  final String clientName;
  final String kind;

  bool get isOnboard => kind == "onboard";

  factory CashBoxDayRenewal.fromJson(Map<String, dynamic> json) {
    return CashBoxDayRenewal(
      id: json["id"] as String,
      amount: (json["amount"] as num).toDouble(),
      createdAt: json["createdAt"] as String,
      clientCode: json["clientCode"] as String,
      clientName: json["clientName"] as String,
      kind: json["kind"] as String? ?? "renewal",
    );
  }
}

class CashBoxDayExpense {
  const CashBoxDayExpense({
    required this.id,
    required this.amount,
    required this.description,
    this.reportedAt,
    this.routeId,
    this.routeName,
    this.receipts = const [],
  });

  final String id;
  final double amount;
  final String description;
  final String? reportedAt;
  final String? routeId;
  final String? routeName;
  final List<CashBoxExpenseReceipt> receipts;

  factory CashBoxDayExpense.fromJson(Map<String, dynamic> json) {
    final receiptsJson = json["receipts"] as List<dynamic>? ?? [];
    return CashBoxDayExpense(
      id: json["id"] as String,
      amount: (json["amount"] as num).toDouble(),
      description: json["description"] as String,
      reportedAt: json["reportedAt"] as String?,
      routeId: json["routeId"] as String?,
      routeName: json["routeName"] as String?,
      receipts: receiptsJson
          .map((e) => CashBoxExpenseReceipt.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CashBoxExpenseReceipt {
  const CashBoxExpenseReceipt({
    required this.id,
    required this.mimeType,
    this.originalFileName,
    this.uploadedAt,
  });

  final String id;
  final String mimeType;
  final String? originalFileName;
  final String? uploadedAt;

  factory CashBoxExpenseReceipt.fromJson(Map<String, dynamic> json) {
    return CashBoxExpenseReceipt(
      id: json["id"] as String,
      mimeType: json["mimeType"] as String,
      originalFileName: json["originalFileName"] as String?,
      uploadedAt: json["uploadedAt"] as String?,
    );
  }
}

class CashBoxSpreadsheetDayExpense {
  const CashBoxSpreadsheetDayExpense({
    required this.id,
    required this.description,
    required this.amount,
    required this.reportedAt,
    required this.receiptCount,
  });

  final String id;
  final String description;
  final double amount;
  final String reportedAt;
  final int receiptCount;

  factory CashBoxSpreadsheetDayExpense.fromJson(Map<String, dynamic> json) {
    return CashBoxSpreadsheetDayExpense(
      id: json["id"] as String,
      description: json["description"] as String,
      amount: (json["amount"] as num).toDouble(),
      reportedAt: json["reportedAt"] as String,
      receiptCount: json["receiptCount"] as int? ?? 0,
    );
  }
}

class CashBoxSpreadsheetRow {
  const CashBoxSpreadsheetRow({
    required this.date,
    required this.dateLabel,
    required this.dayName,
    required this.base,
    required this.entradas,
    required this.salidas,
    required this.salidaOficina,
    required this.especificacion,
    required this.dayExpenses,
    required this.inactive,
  });

  final String date;
  final String dateLabel;
  final String dayName;
  final double base;
  final Map<String, double> entradas;
  final Map<String, double> salidas;
  final double salidaOficina;
  final String especificacion;
  final List<CashBoxSpreadsheetDayExpense> dayExpenses;
  final bool inactive;

  factory CashBoxSpreadsheetRow.fromJson(Map<String, dynamic> json) {
    final entradasRaw = json["entradas"] as Map<String, dynamic>? ?? {};
    final salidasRaw = json["salidas"] as Map<String, dynamic>? ?? {};
    final expensesJson = json["dayExpenses"] as List<dynamic>? ?? [];
    return CashBoxSpreadsheetRow(
      date: json["date"] as String,
      dateLabel: json["dateLabel"] as String,
      dayName: json["dayName"] as String,
      base: (json["base"] as num).toDouble(),
      entradas: entradasRaw.map(
        (key, value) => MapEntry(key, (value as num).toDouble()),
      ),
      salidas: salidasRaw.map(
        (key, value) => MapEntry(key, (value as num).toDouble()),
      ),
      salidaOficina: (json["salidaOficina"] as num).toDouble(),
      especificacion: json["especificacion"] as String? ?? "",
      dayExpenses: expensesJson
          .map(
            (e) => CashBoxSpreadsheetDayExpense.fromJson(
              e as Map<String, dynamic>,
            ),
          )
          .toList(),
      inactive: json["inactive"] as bool? ?? false,
    );
  }
}

class CashBoxSpreadsheet {
  const CashBoxSpreadsheet({
    required this.month,
    required this.title,
    required this.from,
    required this.to,
    required this.periodStart,
    required this.routes,
    required this.initialBalance,
    required this.totalEnCaja,
    required this.rows,
  });

  final String month;
  final String title;
  final String from;
  final String to;
  final String? periodStart;
  final List<CashBoxRouteOption> routes;
  final double initialBalance;
  final double totalEnCaja;
  final List<CashBoxSpreadsheetRow> rows;

  factory CashBoxSpreadsheet.fromJson(Map<String, dynamic> json) {
    final routesJson = json["routes"] as List<dynamic>? ?? [];
    final rowsJson = json["rows"] as List<dynamic>? ?? [];
    final summary = json["summary"] as Map<String, dynamic>? ?? {};
    return CashBoxSpreadsheet(
      month: json["month"] as String,
      title: json["title"] as String,
      from: json["from"] as String,
      to: json["to"] as String,
      periodStart: json["periodStart"] as String?,
      routes: routesJson
          .map((e) => CashBoxRouteOption.fromJson(e as Map<String, dynamic>))
          .toList(),
      initialBalance: (summary["initialBalance"] as num?)?.toDouble() ?? 0,
      totalEnCaja: (summary["totalEnCaja"] as num?)?.toDouble() ?? 0,
      rows: rowsJson
          .map((e) => CashBoxSpreadsheetRow.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
