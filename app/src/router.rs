use crate::persistence;
use crate::hubs::{encode_hub, json_hub, security_hub};
use crate::landing::LandingPage;
use crate::shell::{self, command_palette, keyboard, navbar, toast};
use crate::state::{use_app_state, AppState};
use crate::tools::{diff_checker, epoch_converter, regex_tester};
use dioxus::prelude::*;
use dioxus_router::{Outlet, Router, Routable};

static CSS: Asset = asset!("/assets/zerodock.css");

#[derive(Routable, Clone, PartialEq)]
#[rustfmt::skip]
pub enum Route {
    #[layout(Shell)]
        #[route("/")]
        Landing {},
        #[route("/json-toolkit")]
        JsonToolkit {},
        #[route("/encode-decode")]
        EncodeDecode {},
        #[route("/security")]
        Security {},
        #[route("/diff-checker")]
        DiffChecker {},
        #[route("/epoch-converter")]
        EpochConverter {},
        #[route("/regex-tester")]
        RegexTester {},
        #[route("/yaml-json-converter")]
        YamlJsonConverter {},
        #[route("/json-type-converter")]
        JsonTypeConverter {},
        #[route("/json-path")]
        JsonPath {},
        #[route("/base64-codec")]
        Base64Codec {},
        #[route("/url-encoder")]
        UrlEncoder {},
        #[route("/hash-generator")]
        HashGenerator {},
        #[route("/jwt-decoder")]
        JwtDecoder {},
}

#[component]
pub fn App() -> Element {
    let platform = use_context::<zerodock_platform::PlatformServices>();
    let app_state = use_hook(AppState::new);

    use_context_provider(|| app_state.clone());

    persistence::use_persistence(app_state.clone(), platform.clone());

    let is_dark = app_state.is_dark();

    rsx! {
        document::Title { "ZeroDock" }
        document::Stylesheet { href: CSS }
        ThemeSync {}
        div {
            class: if is_dark { "dark h-dvh flex flex-col overflow-hidden" } else { "h-dvh flex flex-col overflow-hidden" },
            style: "background: var(--zd-bg); color: var(--zd-text-secondary);",
            Router::<Route> {}
        }
    }
}

#[component]
fn ThemeSync() -> Element {
    let app_state = use_app_state();
    use_effect(move || {
        let is_dark = app_state.is_dark();
        let js = if is_dark {
            "document.documentElement.classList.add('dark');"
        } else {
            "document.documentElement.classList.remove('dark');"
        };
        let _ = dioxus::document::eval(js);
    });
    VNode::empty()
}

/// Map a registry path (e.g. `/jwt-decoder`) to a router `Route`.
pub fn route_for_path(path: &str) -> Route {
    match path {
        "/" => Route::Landing {},
        "/json-toolkit" => Route::JsonToolkit {},
        "/encode-decode" => Route::EncodeDecode {},
        "/security" => Route::Security {},
        "/diff-checker" => Route::DiffChecker {},
        "/epoch-converter" => Route::EpochConverter {},
        "/regex-tester" => Route::RegexTester {},
        "/yaml-json-converter" => Route::YamlJsonConverter {},
        "/json-type-converter" => Route::JsonTypeConverter {},
        "/json-path" => Route::JsonPath {},
        "/base64-codec" => Route::Base64Codec {},
        "/url-encoder" => Route::UrlEncoder {},
        "/hash-generator" => Route::HashGenerator {},
        "/jwt-decoder" => Route::JwtDecoder {},
        _ => Route::Landing {},
    }
}

#[component]
fn Shell() -> Element {
    rsx! {
        keyboard::GlobalKeyboardHandler {}
        shell::skip_link::SkipLink {}
        navbar::Navbar {}
        div {
            class: "flex-1 flex flex-col min-h-0 overflow-hidden",
            Outlet::<Route> {}
        }
        command_palette::CommandPalette {}
        toast::ToastContainer {}
        toast::KeyboardShortcutsHelp {}
        shell::zen_exit::ZenExitAffordance {}
        shell::preferences_modal::PreferencesModal {}
    }
}

#[component]
fn Landing() -> Element {
    rsx! { LandingPage {} }
}

#[component]
fn JsonToolkit() -> Element {
    rsx! { json_hub::JsonHub { initial_panel: None } }
}

#[component]
fn EncodeDecode() -> Element {
    rsx! { encode_hub::EncodeHub { initial_tab: "base64".to_string() } }
}

#[component]
fn Security() -> Element {
    rsx! { security_hub::SecurityHub { initial_tab: "hash".to_string() } }
}

#[component]
fn DiffChecker() -> Element {
    rsx! { diff_checker::DiffChecker {} }
}

#[component]
fn EpochConverter() -> Element {
    rsx! { epoch_converter::EpochConverter {} }
}

#[component]
fn RegexTester() -> Element {
    rsx! { regex_tester::RegexTester {} }
}

#[component]
fn YamlJsonConverter() -> Element {
    rsx! { json_hub::JsonHub { initial_panel: Some("yaml".to_string()) } }
}

#[component]
fn JsonTypeConverter() -> Element {
    rsx! { json_hub::JsonHub { initial_panel: Some("types".to_string()) } }
}

#[component]
fn JsonPath() -> Element {
    rsx! { json_hub::JsonHub { initial_panel: Some("path".to_string()) } }
}

#[component]
fn Base64Codec() -> Element {
    rsx! { encode_hub::EncodeHub { initial_tab: "base64".to_string() } }
}

#[component]
fn UrlEncoder() -> Element {
    rsx! { encode_hub::EncodeHub { initial_tab: "url".to_string() } }
}

#[component]
fn HashGenerator() -> Element {
    rsx! { security_hub::SecurityHub { initial_tab: "hash".to_string() } }
}

#[component]
fn JwtDecoder() -> Element {
    rsx! { encode_hub::EncodeHub { initial_tab: "jwt".to_string() } }
}
