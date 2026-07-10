#[cfg(feature = "native")]
mod native {
    use rsa::pkcs8::{EncodePrivateKey, EncodePublicKey, LineEnding};
    use rsa::{RsaPrivateKey, RsaPublicKey};

    #[derive(Debug, Clone)]
    pub struct RsaKeyPair {
        pub private_pem: String,
        pub public_pem: String,
        pub bits: usize,
    }

    pub fn generate_rsa(bits: usize) -> crate::Result<RsaKeyPair> {
        let mut rng = rand::thread_rng();
        let private_key = RsaPrivateKey::new(&mut rng, bits)?;
        let public_key = RsaPublicKey::from(&private_key);
        let private_pem = private_key
            .to_pkcs8_pem(LineEnding::LF)
            .map_err(|e| crate::CoreError::Message(e.to_string()))?
            .to_string();
        let public_pem = public_key
            .to_public_key_pem(LineEnding::LF)
            .map_err(|e| crate::CoreError::Message(e.to_string()))?;
        Ok(RsaKeyPair {
            private_pem,
            public_pem,
            bits,
        })
    }
}

#[cfg(feature = "native")]
pub use native::*;

#[cfg(not(feature = "native"))]
pub fn generate_rsa(_bits: usize) -> crate::Result<RsaKeyPair> {
    Err(crate::CoreError::Message(
        "RSA key generation requires the native/desktop build".into(),
    ))
}

#[cfg(not(feature = "native"))]
#[derive(Debug, Clone)]
pub struct RsaKeyPair {
    pub private_pem: String,
    pub public_pem: String,
    pub bits: usize,
}
