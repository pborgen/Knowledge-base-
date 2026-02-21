import Foundation
import SwiftUI

@MainActor
final class AppViewModel: ObservableObject {
    @Published var backendURL: String {
        didSet { UserDefaults.standard.set(backendURL, forKey: "backendURL") }
    }
    @Published var question: String = ""
    @Published var answer: String = ""
    @Published var status: String = ""
    @Published var ownerEmail: String {
        didSet { UserDefaults.standard.set(ownerEmail, forKey: "ownerEmail") }
    }
    @Published var spaces: [Space] = []
    @Published var selectedSpaceId: String = "" {
        didSet { UserDefaults.standard.set(selectedSpaceId, forKey: "selectedSpaceId") }
    }
    @Published var newSpaceName: String = ""
    @Published var newSpaceVisibility: String = "private"
    @Published var shareTargetEmail: String = ""

    private let api = APIClient()

    init() {
        self.backendURL = UserDefaults.standard.string(forKey: "backendURL") ?? "http://YOUR-HOST-IP:8787"
        self.ownerEmail = UserDefaults.standard.string(forKey: "ownerEmail") ?? "local"
        self.selectedSpaceId = UserDefaults.standard.string(forKey: "selectedSpaceId") ?? ""
    }

    func ask() async {
        let trimmed = question.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        do {
            status = "Querying..."
            answer = try await api.answer(baseURL: backendURL, question: trimmed, userEmail: ownerEmail, spaceId: selectedSpaceId)
            status = "Done"
        } catch {
            status = "Error: \(error.localizedDescription)"
        }
    }

    func loadSpaces() async {
        do {
            status = "Loading spaces..."
            let fetched = try await api.listSpaces(baseURL: backendURL, userEmail: ownerEmail)
            spaces = fetched
            if selectedSpaceId.isEmpty, let first = fetched.first { selectedSpaceId = first.id }
            status = "Spaces loaded"
        } catch {
            status = "Spaces error: \(error.localizedDescription)"
        }
    }

    func createSpace() async {
        guard !newSpaceName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        do {
            status = "Creating space..."
            let s = try await api.createSpace(baseURL: backendURL, userEmail: ownerEmail, name: newSpaceName, visibility: newSpaceVisibility)
            spaces.append(s)
            selectedSpaceId = s.id
            newSpaceName = ""
            status = "Space created"
        } catch {
            status = "Create space error: \(error.localizedDescription)"
        }
    }

    func shareSelectedSpace() async {
        guard !selectedSpaceId.isEmpty, !shareTargetEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        do {
            status = "Sharing space..."
            _ = try await api.shareSpace(baseURL: backendURL, userEmail: ownerEmail, spaceId: selectedSpaceId, targetEmail: shareTargetEmail)
            shareTargetEmail = ""
            await loadSpaces()
            status = "Space shared"
        } catch {
            status = "Share error: \(error.localizedDescription)"
        }
    }

    func setSelectedSpaceVisibility() async {
        guard !selectedSpaceId.isEmpty else { return }
        do {
            status = "Updating visibility..."
            _ = try await api.setSpaceVisibility(baseURL: backendURL, userEmail: ownerEmail, spaceId: selectedSpaceId, visibility: newSpaceVisibility)
            await loadSpaces()
            status = "Visibility updated"
        } catch {
            status = "Visibility error: \(error.localizedDescription)"
        }
    }

    func uploadFile(url: URL) async {
        do {
            status = "Uploading \(url.lastPathComponent)..."
            try await api.uploadFile(baseURL: backendURL, fileURL: url, owner: ownerEmail, spaceId: selectedSpaceId)
            status = "Uploaded + ingested"
        } catch {
            status = "Upload error: \(error.localizedDescription)"
        }
    }

    func ingestGoogleDoc(docUrl: String, idToken: String, accessToken: String) async {
        do {
            status = "Ingesting Google Doc..."
            try await api.ingestGoogleDoc(baseURL: backendURL, docUrl: docUrl, idToken: idToken, accessToken: accessToken, spaceId: selectedSpaceId)
            status = "Google Doc ingested"
        } catch {
            status = "Google ingest error: \(error.localizedDescription)"
        }
    }
}
