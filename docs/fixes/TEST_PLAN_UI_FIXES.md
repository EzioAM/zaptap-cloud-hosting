# 🧪 Quick Test Plan for UI/UX Fixes

## **Test 1: Build Automation Screen Text Fields**

### **Steps to Test**:
1. Navigate to Build/Create Automation screen
2. Tap on automation name field
3. Tap on automation description field

### **Expected Results**:
✅ Text fields should have Material Design outlined style  
✅ Proper labels should appear ("Automation Name", "Description (optional)")  
✅ Consistent theming with app colors  
✅ No more basic border/background styling  

---

## **Test 2: Add Step Screen Steps**

### **Steps to Test**:
1. Go to automation builder
2. Tap the "+" button to add a step
3. Browse through available steps
4. Check different categories

### **Expected Results**:
✅ Should see 35+ step types (vs ~16 before)  
✅ Steps organized by categories: Communication, Web & Network, Control Flow, Device, Apps & System, Productivity, Data  
✅ Each step should have clear descriptions  
✅ All steps should be selectable and functional  

### **Categories to Verify**:
- **Communication**: Notification, SMS, Email, Speak Text
- **Web & Network**: Webhook, HTTP Request, WiFi, Bluetooth  
- **Control Flow**: Delay, Condition, Variables, Script, Loop
- **Device**: Location, Clipboard, Sound, Vibration, Flashlight, Brightness, Photo
- **Apps & System**: Open App, Close App, Share, Shortcuts
- **Productivity**: Calendar, Reminder, Contact, Translate, Text Processing, Math
- **Data**: Weather

---

## **Test 3: Profile Screen Authentication**

### **Test 3a: When NOT Signed In (Guest User)**
1. Navigate to Profile screen
2. Check user info at top
3. Scroll to bottom and check buttons

**Expected Results**:
✅ Should show "Guest User" as name  
✅ Should show "Not signed in" as email  
✅ Should show guest message encouraging sign-in  
✅ Should show "Sign In" button at bottom (NOT "Sign Out")  
✅ Stats should show zeros  

### **Test 3b: When Signed In**
1. Sign in to the app
2. Navigate to Profile screen
3. Check user info and buttons

**Expected Results**:
✅ Should show actual user name/email  
✅ Should NOT show guest message  
✅ Should show "Sign Out" button at bottom  
✅ Stats should show actual user data  

---

## **🎯 Quick Verification Checklist**

- [ ] Text inputs use Material Design outlined style
- [ ] Automation name and description fields have proper labels
- [ ] Step picker shows 30+ step options
- [ ] Steps are organized by categories
- [ ] Profile shows "Guest User" when not signed in
- [ ] Profile shows "Sign In" button when not authenticated
- [ ] Profile shows "Sign Out" button when authenticated
- [ ] No contradictory authentication messages

---

## **🚨 If Issues Found**

If any of these tests fail, please:

1. **Check the file paths** - ensure changes were applied correctly
2. **Restart the app** - some changes may require a fresh app restart
3. **Clear cache** - try clearing Metro cache: `npx react-native start --reset-cache`
4. **Check imports** - verify all required imports are present

## **📱 Device Testing**

Test on both:
- **iOS devices/simulator**
- **Android devices/emulator**

The Material Design components should work consistently across platforms.

---

**Status**: Ready for testing! 🚀
