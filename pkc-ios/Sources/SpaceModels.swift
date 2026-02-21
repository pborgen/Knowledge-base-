import Foundation

struct Space: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let ownerEmail: String
    let visibility: String
    let memberEmails: [String]
}

struct SpacesResponse: Codable {
    let ok: Bool
    let spaces: [Space]
}
