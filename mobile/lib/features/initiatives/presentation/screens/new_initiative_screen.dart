import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/i18n/strings.dart';
import '../providers/initiative_providers.dart';

class NewInitiativeScreen extends ConsumerStatefulWidget {
  const NewInitiativeScreen({super.key, required this.communityId});
  final String communityId;

  @override
  ConsumerState<NewInitiativeScreen> createState() => _NewInitiativeScreenState();
}

class _NewInitiativeScreenState extends ConsumerState<NewInitiativeScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  String _category = 'other';
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit({required bool alsoSubmitForReview}) async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(initiativeRepositoryProvider);
      final draft = await repo.create(
        widget.communityId,
        title: _titleCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        category: _category,
      );
      if (alsoSubmitForReview) {
        await repo.submit(draft.id);
      }
      ref.invalidate(initiativesProvider(widget.communityId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            alsoSubmitForReview ? S.initiativeSubmittedMsg : S.initiativeCreated,
          ),
        ),
      );
      context.pop();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text(S.newInitiative)),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: ListView(
              children: [
                TextFormField(
                  controller: _titleCtrl,
                  maxLength: 200,
                  decoration: const InputDecoration(labelText: S.initiativeTitle),
                  validator: (v) {
                    final s = (v ?? '').trim();
                    if (s.length < 2) return S.required;
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _descCtrl,
                  minLines: 3,
                  maxLines: 8,
                  maxLength: 5000,
                  decoration: const InputDecoration(labelText: S.initiativeDescription),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _category,
                  decoration: const InputDecoration(labelText: S.initiativeCategory),
                  items: const ['event', 'volunteer', 'product', 'social', 'other']
                      .map(
                        (c) => DropdownMenuItem(value: c, child: Text(S.initiativeCategoryLabel(c))),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _category = v ?? 'other'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _loading ? null : () => _submit(alsoSubmitForReview: true),
                  child: Text(_loading ? S.loading : S.submitInitiativeCta),
                ),
                const SizedBox(height: 8),
                OutlinedButton(
                  onPressed: _loading ? null : () => _submit(alsoSubmitForReview: false),
                  child: const Text(S.save),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
