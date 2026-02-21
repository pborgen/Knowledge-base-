import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @EnvironmentObject var vm: AppViewModel
    @State private var showPicker = false
    @State private var googleDocURL = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Backend") {
                    TextField("http://YOUR-HOST-IP:8787", text: $vm.backendURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                Section("Add documents") {
                    Button("Upload file from iPhone") { showPicker = true }

                    TextField("Google Doc URL", text: $googleDocURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    Button("Sign in with Google + Ingest Doc") {
                        Task { await signInAndIngestGoogleDoc() }
                    }
                }

                Section("Ask") {
                    TextField("Ask a question", text: $vm.question, axis: .vertical)
                    Button("Ask knowledge base") {
                        Task { await vm.ask() }
                    }
                    if !vm.answer.isEmpty {
                        Text(vm.answer)
                            .font(.footnote)
                    }
                }

                if !vm.status.isEmpty {
                    Section("Status") { Text(vm.status) }
                }
            }
            .navigationTitle("Knowledge Base")
            .fileImporter(isPresented: $showPicker, allowedContentTypes: [.data], allowsMultipleSelection: false) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    let granted = url.startAccessingSecurityScopedResource()
                    Task {
                        await vm.uploadFile(url: url)
                        if granted { url.stopAccessingSecurityScopedResource() }
                    }
                case .failure(let error):
                    vm.status = "Picker error: \(error.localizedDescription)"
                }
            }
        }
    }

    private func signInAndIngestGoogleDoc() async {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let root = scene.windows.first?.rootViewController else {
            vm.status = "No root view controller"
            return
        }

        do {
            let tokens = try await GoogleSignInManager.shared.signIn(presentingViewController: root)
            vm.ownerEmail = tokens.email
            await vm.ingestGoogleDoc(docUrl: googleDocURL, idToken: tokens.idToken, accessToken: tokens.accessToken)
        } catch {
            vm.status = "Google sign-in error: \(error.localizedDescription)"
        }
    }
}
