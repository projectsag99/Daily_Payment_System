import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../providers/app_providers.dart";

class PendingSyncBanner extends ConsumerWidget {
  const PendingSyncBanner({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pendingAsync = ref.watch(pendingCountProvider);

    return pendingAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (count) {
        if (count <= 0) return const SizedBox.shrink();
        return MaterialBanner(
          content: Text(
            count == 1
                ? "1 pago pendiente de sincronizar"
                : "$count pagos pendientes de sincronizar",
          ),
          leading: const Icon(Icons.cloud_upload_outlined),
          actions: [
            TextButton(
              onPressed: () => ref.read(syncControllerProvider).flush(),
              child: const Text("Sincronizar"),
            ),
          ],
        );
      },
    );
  }
}
