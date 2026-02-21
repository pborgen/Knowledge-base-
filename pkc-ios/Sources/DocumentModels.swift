import Foundation

struct DocumentItem: Codable, Identifiable, Hashable {
    let docId: String
    let source: String
    let ownerEmail: String
    let spaceId: String
    let visibility: String
    let allowedEmails: [String]
    let updatedAt: String

    var id: String { docId }
}

struct DocumentsResponse: Codable {
    let ok: Bool
    let documents: [DocumentItem]
}
