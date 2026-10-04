# source this: points the app at the LOCAL Supabase stand-in (never at a real project).
KEYS=$(curl -s http://127.0.0.1:54321/__mock/keys)
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(echo "$KEYS" | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).anon))')
export SUPABASE_SERVICE_ROLE_KEY=$(echo "$KEYS" | node -e 'process.stdin.on("data",d=>console.log(JSON.parse(d).service))')
export RATE_LIMIT_SALT=test-salt
