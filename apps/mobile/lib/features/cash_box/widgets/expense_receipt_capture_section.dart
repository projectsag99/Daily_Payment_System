import "dart:io";

import "package:flutter/material.dart";
import "package:image_picker/image_picker.dart";
import "package:permission_handler/permission_handler.dart";

class ExpenseReceiptCaptureSection extends StatefulWidget {
  const ExpenseReceiptCaptureSection({
    super.key,
    required this.photos,
    required this.onChanged,
    this.enabled = true,
  });

  final List<File> photos;
  final ValueChanged<List<File>> onChanged;
  final bool enabled;

  @override
  State<ExpenseReceiptCaptureSection> createState() =>
      _ExpenseReceiptCaptureSectionState();
}

class _ExpenseReceiptCaptureSectionState
    extends State<ExpenseReceiptCaptureSection> {
  static final ImagePicker _picker = ImagePicker();
  static const _maxPhotos = 10;

  Future<bool> _ensureCameraPermission() async {
    if (!Platform.isAndroid && !Platform.isIOS) return true;
    var status = await Permission.camera.status;
    if (status.isGranted) return true;
    status = await Permission.camera.request();
    return status.isGranted;
  }

  Future<bool> _ensureGalleryPermission() async {
    if (!Platform.isIOS) return true;
    var status = await Permission.photos.status;
    if (status.isGranted || status.isLimited) return true;
    status = await Permission.photos.request();
    return status.isGranted || status.isLimited;
  }

  Future<void> _pick(ImageSource source) async {
    if (!widget.enabled) return;
    if (widget.photos.length >= _maxPhotos) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Máximo $_maxPhotos fotos por gasto")),
      );
      return;
    }

    if (source == ImageSource.camera) {
      if (!await _ensureCameraPermission()) return;
    } else if (!await _ensureGalleryPermission()) {
      return;
    }

    final photo = await _picker.pickImage(
      source: source,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 62,
    );
    if (photo == null) return;

    widget.onChanged([...widget.photos, File(photo.path)]);
  }

  void _removePhoto(int index) {
    final next = [...widget.photos]..removeAt(index);
    widget.onChanged(next);
  }

  Future<void> _showSourceMenu() async {
    if (!widget.enabled) return;
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text("Tomar foto"),
              onTap: () {
                Navigator.pop(context);
                _pick(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text("Elegir de galería"),
              onTap: () {
                Navigator.pop(context);
                _pick(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                "Facturas / comprobantes (opcional)",
                style: Theme.of(context).textTheme.titleSmall,
              ),
            ),
            Text(
              "${widget.photos.length}/$_maxPhotos",
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (widget.photos.isNotEmpty)
          SizedBox(
            height: 96,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: widget.photos.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final photo = widget.photos[index];
                return Stack(
                  clipBehavior: Clip.none,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        photo,
                        width: 96,
                        height: 96,
                        fit: BoxFit.cover,
                      ),
                    ),
                    Positioned(
                      top: -8,
                      right: -8,
                      child: IconButton.filledTonal(
                        visualDensity: VisualDensity.compact,
                        iconSize: 18,
                        onPressed: widget.enabled
                            ? () => _removePhoto(index)
                            : null,
                        icon: const Icon(Icons.close),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: widget.enabled ? _showSourceMenu : null,
          icon: const Icon(Icons.add_a_photo_outlined),
          label: const Text("Agregar foto de factura"),
        ),
      ],
    );
  }
}
