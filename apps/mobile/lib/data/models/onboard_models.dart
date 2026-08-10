class OnboardClientResponse {
  const OnboardClientResponse({
    required this.clientId,
    required this.clientCode,
    required this.clientFullName,
    required this.creditInstallmentAmount,
    required this.creditTotalInstallments,
    required this.creditTotalRepayable,
    required this.routeAssigned,
    this.routeName,
  });

  final String clientId;
  final String clientCode;
  final String clientFullName;
  final double creditInstallmentAmount;
  final int creditTotalInstallments;
  final double creditTotalRepayable;
  final bool routeAssigned;
  final String? routeName;

  factory OnboardClientResponse.fromJson(Map<String, dynamic> json) {
    final client = json["client"] as Map<String, dynamic>;
    final credit = json["credit"] as Map<String, dynamic>;
    final route = json["route"] as Map<String, dynamic>;
    return OnboardClientResponse(
      clientId: client["id"] as String,
      clientCode: client["code"] as String,
      clientFullName: client["fullName"] as String,
      creditInstallmentAmount: (credit["installmentAmount"] as num).toDouble(),
      creditTotalInstallments: credit["totalInstallments"] as int,
      creditTotalRepayable: (credit["totalRepayable"] as num).toDouble(),
      routeAssigned: route["assigned"] as bool? ?? false,
      routeName: route["name"] as String?,
    );
  }
}

class CashBoxExpenseRecord {
  const CashBoxExpenseRecord({
    required this.id,
    required this.expenseDate,
    required this.amount,
    required this.description,
    this.routeId,
  });

  final String id;
  final String expenseDate;
  final double amount;
  final String description;
  final String? routeId;

  factory CashBoxExpenseRecord.fromJson(Map<String, dynamic> json) {
    return CashBoxExpenseRecord(
      id: json["id"] as String,
      expenseDate: json["expenseDate"] as String,
      amount: (json["amount"] as num).toDouble(),
      description: json["description"] as String,
      routeId: json["routeId"] as String?,
    );
  }
}
