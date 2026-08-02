import "package:flutter/material.dart";

void main() {
  runApp(const DpsMobileApp());
}

class DpsMobileApp extends StatelessWidget {
  const DpsMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Daily Payment",
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A56DB)),
        useMaterial3: true,
      ),
      home: const Scaffold(
        body: Center(
          child: Text("Daily Payment — bootstrap only (Phase M0)"),
        ),
      ),
    );
  }
}
