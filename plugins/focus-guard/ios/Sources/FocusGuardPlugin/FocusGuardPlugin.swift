import Foundation
import UIKit
import UserNotifications
import Capacitor

/// يراقب حالة الجهاز وقت جلسة التركيز:
/// - لما يطلع المستخدم من التطبيق يرسل تنبيه "ارجع لشجرتك"
/// - لما ينقفل الجهاز (بيانات الحماية تصير غير متاحة) يسجل وقت القفل ويشيل التنبيه،
///   عشان قفل الشاشة ما يذبّل الشجرة
@objc(FocusGuardPlugin)
public class FocusGuardPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FocusGuardPlugin"
    public let jsName = "FocusGuard"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "arm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lastLock", returnType: CAPPluginReturnPromise)
    ]

    private let reminderId = "ghars.return"
    private var armed = false
    private var reminderTitle = ""
    private var reminderBody = ""
    private let lockKey = "ghars.lockAt"
    /// محفوظ في UserDefaults عشان لو النظام قفل التطبيق في الخلفية نعرف إنه كان قفل شاشة
    private var lockAt: Double {
        get { UserDefaults.standard.double(forKey: lockKey) }
        set { UserDefaults.standard.set(newValue, forKey: lockKey) }
    }

    override public func load() {
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(didEnterBackground),
                           name: UIApplication.didEnterBackgroundNotification, object: nil)
        center.addObserver(self, selector: #selector(willEnterForeground),
                           name: UIApplication.willEnterForegroundNotification, object: nil)
        center.addObserver(self, selector: #selector(protectedDataWillBecomeUnavailable),
                           name: UIApplication.protectedDataWillBecomeUnavailableNotification, object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    private var nowMs: Double { Date().timeIntervalSince1970 * 1000 }

    private func clearReminder() {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [reminderId])
        center.removeDeliveredNotifications(withIdentifiers: [reminderId])
    }

    @objc func arm(_ call: CAPPluginCall) {
        armed = true
        reminderTitle = call.getString("title") ?? "ارجع لشجرتك 🌱"
        reminderBody = call.getString("body") ?? ""
        call.resolve()
    }

    @objc func disarm(_ call: CAPPluginCall) {
        armed = false
        clearReminder()
        call.resolve()
    }

    @objc func lastLock(_ call: CAPPluginCall) {
        call.resolve(["at": lockAt])
    }

    @objc private func didEnterBackground() {
        guard armed else { return }
        let content = UNMutableNotificationContent()
        content.title = reminderTitle
        content.body = reminderBody
        content.sound = .default
        if #available(iOS 15.0, *) { content.interruptionLevel = .timeSensitive }
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1.5, repeats: false)
        UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: reminderId, content: content, trigger: trigger))
    }

    @objc private func willEnterForeground() {
        clearReminder()
    }

    /// تنطلق بعد قفل جهاز عليه رمز دخول. نعتبرها قفل شاشة مو خروج من التطبيق
    @objc private func protectedDataWillBecomeUnavailable() {
        lockAt = nowMs
        clearReminder()
    }
}
