with open("src/views/ProfileView.tsx", "r") as f:
    content = f.read()

content = content.replace("FirebaseService.updateUser(updatedUser);", "FirebaseService.saveUserProfile(updatedUser, user.username);")
content = content.replace("StorageService.setCurrentUser(updatedUser);", "StorageService.saveUser(updatedUser);")

# Fix displayAvatar
# const displayAvatar = getRealAvatar(avatarFile ? avatar : user.avatar, currentUsername);
# should be:
# const displayAvatar = avatarFile ? avatar : sanitizeAvatarUrl(user.avatar, currentUsername);
content = content.replace(
    "const displayAvatar = getRealAvatar(avatarFile ? avatar : user.avatar, currentUsername);",
    "const displayAvatar = avatarFile ? avatar : sanitizeAvatarUrl(user.avatar, currentUsername);"
)

with open("src/views/ProfileView.tsx", "w") as f:
    f.write(content)
