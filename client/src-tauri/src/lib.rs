use std::process::Command;
use tauri_plugin_fs::FsExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Command::new("node")
        .arg("../../server/dist/index.js")
        .spawn()
        .expect("Failed to start server process");

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let scope = app.fs_scope();
            scope.allow_directory("*", false);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
