mod hubs;
mod landing;
mod persistence;
mod registry;
mod router;
mod shell;
mod state;
mod tools;

use dioxus::prelude::*;
use router::App;

fn main() {
    init_logging();

    #[cfg(all(feature = "web", target_arch = "wasm32"))]
    {
        use zerodock_platform::PlatformServices;
        let platform = PlatformServices::web();
        dioxus::LaunchBuilder::new()
            .with_context(platform)
            .launch(App);
    }

    #[cfg(all(feature = "desktop", not(target_arch = "wasm32")))]
    {
        use zerodock_platform::PlatformServices;
        let platform = PlatformServices::desktop().expect("platform init");
        dioxus::LaunchBuilder::new()
            .with_context(platform)
            .launch(App);
    }
}

fn init_logging() {
    #[cfg(target_arch = "wasm32")]
    {
        let _ = dioxus::logger::init(tracing::Level::INFO);
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        tracing_subscriber::fmt()
            .with_max_level(tracing::Level::INFO)
            .init();
    }
}
