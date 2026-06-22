import forge from 'https://esm.sh/node-forge@1.3.1';

export function pemToDer(pem: string, label = 'PEM'): Uint8Array {
  const normalized = pem.replace(/\\n/g, '\n').trim();
  const match = normalized.match(/-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/);
  if (!match) {
    throw new Error(`Invalid ${label}: no PEM block found`);
  }
  const b64 = match[1].replace(/\s/g, '');
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    throw new Error(`Failed to decode base64 in ${label}`);
  }
}

export async function sha1Hex(data: Uint8Array): Promise<string> {
  const hash = forge.md.sha1.create();
  hash.update(forge.util.binary.raw.encode(data));
  return hash.digest().toHex();
}

/** Apple Wallet requires PKCS#7 with contentType, messageDigest, and signingTime attributes. */
export function createPkcs7Signature(
  manifestBytes: Uint8Array,
  certPem: string,
  keyPem: string,
  wwdrPem: string,
): Uint8Array {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(forge.util.binary.raw.encode(manifestBytes));

  const signerCert = forge.pki.certificateFromPem(certPem);
  const wwdr = forge.pki.certificateFromPem(wwdrPem);
  const signerKey = forge.pki.privateKeyFromPem(keyPem);

  p7.addCertificate(wwdr);
  p7.addCertificate(signerCert);

  p7.addSigner({
    key: signerKey,
    certificate: signerCert,
    digestAlgorithm: forge.pki.oids.sha1,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime },
    ],
  });

  p7.sign({ detached: true });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const out = new Uint8Array(der.length);
  for (let i = 0; i < der.length; i++) out[i] = der.charCodeAt(i);
  return out;
}
