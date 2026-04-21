const axios = require('axios');

async function getToken() {
  try {
    const res = await axios.post('https://oauth.zaloapp.com/v4/oa/access_token', {
      app_id: '1431574563759380559',
      app_secret: 'YM2c9PVqIBDNpwK8OKiv',
      code: 'VWBB0PsZuN089yuEaPNWF4GWtNkIiVe52YQZVicGooyR3_9jkuwgE34TkpgNbBjsGp_b9kUll6DGBECrXR_VSYOgo3-Coii3BLZFJ_pGvZvpSObud-lp1J4ZWnxE-lfyKLJTP-o_WNneTkX7vv_I55KLaaIDahWc0H6KK8lfjLytTS5Qfx-wHMrwdr-QxyGCJcRzIFtxhaq3O_Gwkl-j9Z4yaodx-9OrKMAxFS2gt2fyBl17X-xcUZ81iccprSM1BdAgqj_8zFAMRygWezxaspXhmw2yryBrIN3SkSRKyiO5kfys-lxyP6TBv2XJGUyJnltQHtSRaooTcAzwIdoOFFpnssOWRPDwohgd17jKjoLUMIQ7jYHs-RQbOG'
    });

    console.log('✅ TOKEN:', res.data);
  } catch (err) {
    console.error('❌ Lỗi:', err.response?.data || err.message);
  }
}

getToken();