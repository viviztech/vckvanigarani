import '../../services/api_client.dart';
import 'bearer.dart';

class DirectoryService {
  DirectoryService(this._api);
  final ApiClient _api;

  /// FR-009, spec.md Story 2: any authenticated bearer can search, not just
  /// admins — see backend CallerScopeService.resolveForDirectory.
  Future<List<DirectoryBearer>> search(String query) async {
    final res = await _api.dio.get('/bearers', queryParameters: query.isEmpty ? null : {'query': query});
    return (res.data as List).map((b) => DirectoryBearer.fromJson(b as Map<String, dynamic>)).toList();
  }

  Future<DirectoryBearerDetail> getOne(String id) async {
    final res = await _api.dio.get('/bearers/$id');
    return DirectoryBearerDetail.fromJson(res.data as Map<String, dynamic>);
  }
}
