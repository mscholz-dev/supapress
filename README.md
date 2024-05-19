git init
git add .
git commit -m 'init supapress with tracking'
gh repo create supapress --private
git remote add origin git@github.com:**_USERNAME_**:supapress
git push --set-upstream origin main
