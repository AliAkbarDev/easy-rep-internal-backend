(function () {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  if (access_token) {
    const queryParams = new URLSearchParams({
      access_token: access_token,
      expires_at: params.get('expires_at'),
      expires_in: params.get('expires_in'),
      refresh_token: params.get('refresh_token'),
      token_type: params.get('token_type'),
      type: params.get('type'),
    });
    window.location.href = `/api/auth/verify-email?${queryParams.toString()}`;
  } else {
    console.error("No access token found in URL hash");
    document.body.innerHTML = '<p style="color: red;">Authentication failed. No access token found.</p>';
  }
})();