import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowRight } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

type FeatureCardProps = {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    description: string;
    action: string;
    backgroundImage: string;
    disabled?: boolean;
    onPress?: () => void;
};

function FeatureCard({
    title,
    subtitle,
    description,
    action,
    backgroundImage,
    disabled,
    onPress,
}: FeatureCardProps) {
    const showArrow = action.toLowerCase().includes('xem ngay');

    return (
        <Pressable
            style={({ pressed }) => [
                styles.featureCard,
                disabled && styles.featureCardDisabled,
                pressed && !disabled && styles.featureCardPressed,
            ]}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={[styles.featureCardSurface, disabled && styles.featureCardSurfaceDisabled]}>
                <View style={styles.cardMediaRight}>
                    <Image source={{ uri: backgroundImage }} style={styles.cardMediaImage} contentFit="cover" contentPosition="right" />
                </View>

                <LinearGradient
                    colors={['#1A2347', 'rgba(26,35,71,0.92)', 'rgba(26,35,71,0.58)', 'rgba(26,35,71,0.08)']}
                    locations={[0, 0.48, 0.75, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.cardShade}
                />

                <View style={styles.featureCardContent}>
                    <View style={styles.cardTopRow}>
                        <View style={styles.cardTitleWrap}>
                            {title}
                            {subtitle ?? null}
                        </View>
                    </View>

                    <Text style={styles.featureDescription}>{description}</Text>

                    <View style={styles.featureActionRow}>
                        <View style={[styles.featureActionPill, disabled && styles.featureActionPillDisabled]}>
                            <Text style={[styles.featureAction, disabled && styles.featureActionDisabled]}>{action}</Text>
                            {showArrow ? <ArrowRight size={16} color="#EBF1FF" /> : null}
                        </View>
                    </View>
                </View>
            </View>
        </Pressable>
    );
}

const LOGOS = {
    ganhGiaiTri: 'https://img.upanhnhanh.com/d8d7ada8c26081ef68c5f6af04d61982',
    ganhPhim: 'https://img.upanhnhanh.com/59d8b08a46a15c8b4e1ca6f766fa8afa',
    ganh88: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775745095/ganhgame_g8zdu4.png',
    thanhGanhManga: 'https://img.upanhnhanh.com/c1b2b67d909a03f92e233092ed4b56fd',
    ganhTheThao: 'https://img.upanhnhanh.com/7f20bbdd8347a97d368892053626bff2',
    ganh18: 'https://img.upanhnhanh.com/19fa858dbe0b4d7c41c31ac3e05d3a57',
};

const BACKGROUNDS = {
    ganhPhim: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&h=500&fit=crop',
    ganh88: 'https://res.cloudinary.com/df2amyjzw/image/upload/v1775745095/background_ganhgame_bowmpp.jpg',
    thanhGanhManga: 'https://www.thiagiaitri.com/images/bg-thiaanime.jpg',
    ganhTheThao: 'https://www.thiagiaitri.com/images/bg-thiabong.jpg',
    ganh18:
        'https://images.unsplash.com/photo-1503135935062-b7d1f5a0690f?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
};

const SPORTS_GATE_IMAGE = 'https://img.upanhnhanh.com/9ecfcd2828e9c2b6ba2084d1ebe86e56';

export default function IntroScreen() {
    const router = useRouter();
    const scrollRef = useRef<ScrollView>(null);
    const [activeTab, setActiveTab] = useState<'home' | 'terms' | 'license'>('home');
    const [openDocId, setOpenDocId] = useState<'good-standing' | 'business' | null>(null);
    const [showSportsGate, setShowSportsGate] = useState(false);
    const [sportsTermsAccepted, setSportsTermsAccepted] = useState(false);
    const [showGanh18Gate, setShowGanh18Gate] = useState(false);
    const [ganh18Password, setGanh18Password] = useState('');
    const [ganh18PasswordError, setGanh18PasswordError] = useState('');
    const currentDate = useMemo(() => {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        return `${day}/${month}/${year}`;
    }, []);

    const stars = useMemo(
        () =>
            Array.from({ length: 36 }, (_, i) => ({
                id: i,
                left: 12 + ((i * 23) % 300),
                top: 8 + ((i * 37) % 180),
                opacity: 0.2 + ((i * 11) % 7) * 0.1,
            })),
        []
    );

    const handleContinueToSports = () => {
        if (!sportsTermsAccepted) return;

        setShowSportsGate(false);
        router.push('/ganhthethao' as any);
    };

    const handleVerifyGanh18 = () => {
        if (ganh18Password === '183009') {
            setShowGanh18Gate(false);
            setGanh18Password('');
            setGanh18PasswordError('');
            router.push('/ganh18' as any);
        } else {
            setGanh18PasswordError('Mật khẩu không chính xác');
            setGanh18Password('');
        }
    };

    const handleTabChange = (tab: 'home' | 'terms' | 'license') => {
        setActiveTab(tab);
        requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient
                colors={['#0A1436', '#0A1A47', '#0B1F56']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.container}
            >
                <ScrollView ref={scrollRef} style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Image source={{ uri: LOGOS.ganhGiaiTri }} style={styles.brandImage} contentFit="contain" contentPosition="left" />
                    </View>

                    {activeTab === 'home' ? (
                        <>
                            <View style={styles.heroWrap}>
                                <LinearGradient
                                    colors={['#2D3A76', '#2A346D']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.hero}
                                >
                                    {stars.map((s) => (
                                        <View
                                            key={s.id}
                                            style={[
                                                styles.star,
                                                {
                                                    left: s.left,
                                                    top: s.top,
                                                    opacity: s.opacity,
                                                },
                                            ]}
                                        />
                                    ))}

                                    <View style={styles.heroBadge}>
                                        <Text style={styles.heroBadgeText}>{currentDate}</Text>
                                    </View>

                                    <Text style={styles.heroTitle}>Giải trí miễn phí không giới hạn cùng Gánh Giải Trí</Text>
                                    <Text style={styles.heroText}>
                                        Gánh Giải Trí tổng hợp phim, anime, thể thao và nội dung hot cập nhật liên tục.
                                        Tối ưu cho điện thoại để thao tác nhanh và gọn.
                                    </Text>
                                </LinearGradient>
                            </View>

                            <Text style={styles.sectionTitle}>Chọn chuyên mục</Text>

                            <View style={styles.cardsContainer}>
                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.ganhPhim }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    description="Xem phim miễn phí tốc độ nhanh, giao diện tối ưu cho trải nghiệm di động."
                                    action="Xem ngay"
                                    backgroundImage={BACKGROUNDS.ganhPhim}
                                    onPress={() => router.replace('/(tabs)')}
                                />

                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.ganh88 }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    subtitle={<Text style={styles.featureSubtitle}>GAME GIẢI TRÍ | KHÔNG NÊN CỜ BẠC</Text>}
                                    description="Khu giải trí Ganh88 với giao diện riêng và nền hình nổi bật trên mobile."
                                    action="Khám phá"
                                    backgroundImage={BACKGROUNDS.ganh88}
                                    onPress={() => router.push('/ganh88' as any)}
                                />

                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.thanhGanhManga }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    description="Kho anime và hoạt hình chọn lọc với điều hướng đơn giản, mượt mà."
                                    action="Sắp ra mắt"
                                    backgroundImage={BACKGROUNDS.thanhGanhManga}
                                    disabled
                                />

                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.ganhTheThao }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    subtitle={<Text style={styles.featureSubtitle}>KHÔNG NÊN CỜ BẠC</Text>}
                                    description="Không gian tổng hợp thông tin thể thao mang tính giải trí và cập nhật nhanh."
                                    action="Xem ngay"
                                    backgroundImage={BACKGROUNDS.ganhTheThao}
                                    onPress={() => setShowSportsGate(true)}
                                />

                                <FeatureCard
                                    title={<Image source={{ uri: LOGOS.ganh18 }} style={styles.cardTitleLogo} contentFit="contain" contentPosition="left" />}
                                    subtitle={<Text style={styles.featureSubtitle}>18+ | Cần xác minh độ tuổi</Text>}
                                    description="Nội dung dành cho người lớn. Vui lòng xác minh độ tuổi trước khi truy cập."
                                    action="Xem ngay"
                                    backgroundImage={BACKGROUNDS.ganh18}
                                    onPress={() => setShowGanh18Gate(true)}
                                />
                            </View>
                        </>
                    ) : activeTab === 'terms' ? (
                        <View style={styles.termsWrap}>
                            <Text style={styles.termsTitle}>Điều khoản sử dụng</Text>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>1. Điều khoản chung</Text>
                                <Text style={styles.termsText}>
                                    Khi truy cập và sử dụng dịch vụ của GanhGiaiTri, bạn đồng ý tuân thủ các điều khoản và điều kiện được quy định dưới đây. Nếu bạn không đồng ý với bất kỳ điều khoản nào, vui lòng không sử dụng dịch vụ của chúng tôi.
                                </Text>
                                <Text style={styles.termsText}>
                                    GanhGiaiTri có quyền thay đổi, chỉnh sửa hoặc cập nhật các điều khoản này bất kỳ lúc nào mà không cần thông báo trước.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>2. Quyền sở hữu trí tuệ</Text>
                                <Text style={styles.termsText}>
                                    Tất cả nội dung trên GanhGiaiTri bao gồm nhưng không giới hạn: video, hình ảnh, văn bản, giao diện, logo đều thuộc quyền sở hữu hoặc được cấp phép cho GanhGiaiTri.
                                </Text>
                                <Text style={styles.termsText}>
                                    Người dùng không được sao chép, phân phối, chỉnh sửa hoặc sử dụng bất kỳ nội dung nào trên trang web cho mục đích thương mại.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>3. Quy định về nội dung</Text>
                                <Text style={styles.termsText}>
                                    GanhGiaiTri cung cấp nhiều loại nội dung khác nhau, bao gồm cả nội dung dành cho người lớn (GANH18). Người dùng có trách nhiệm đảm bảo rằng mình đủ tuổi pháp lý.
                                </Text>
                                <Text style={styles.termsText}>
                                    Chúng tôi không chịu trách nhiệm nếu người dùng chưa đủ tuổi truy cập vào các nội dung không phù hợp.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>4. Giới hạn trách nhiệm</Text>
                                <Text style={styles.termsText}>
                                    GanhGiaiTri cung cấp dịch vụ trên cơ sở "nguyên trạng" và không đưa ra bất kỳ cam kết hay bảo đảm nào.
                                </Text>
                                <Text style={styles.termsText}>
                                    Chúng tôi không chịu trách nhiệm cho bất kỳ thiệt hại trực tiếp hoặc gián tiếp nào phát sinh từ việc sử dụng dịch vụ.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>5. Quyền riêng tư</Text>
                                <Text style={styles.termsText}>
                                    GanhGiaiTri tôn trọng quyền riêng tư của người dùng. Chúng tôi không thu thập thông tin cá nhân khi bạn sử dụng dịch vụ trừ khi bạn tự nguyện cung cấp.
                                </Text>
                                <Text style={styles.termsText}>
                                    Mọi thông tin thu thập được sẽ chỉ được sử dụng để cải thiện trải nghiệm người dùng.
                                </Text>
                            </View>

                            <View style={styles.termsBlock}>
                                <Text style={styles.termsBlockTitle}>6. Liên hệ</Text>
                                <Text style={styles.termsText}>
                                    Nếu bạn có bất kỳ câu hỏi nào về các điều khoản sử dụng, vui lòng liên hệ với chúng tôi qua trang Liên hệ.
                                </Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.licenseSection}>
                            <Text style={styles.licenseTitle}>Giấy phép kinh doanh</Text>
                            <Text style={styles.licenseSubtitle}>Tài liệu pháp lý của 3 DOT MOVIES PTE. LTD.</Text>

                            <View style={styles.licenseCardWrap}>
                                <View style={styles.licenseCard}>
                                    <View style={styles.licenseCardTextWrap}>
                                        <Text style={styles.licenseCardTitle}>Certificate of Good Standing</Text>
                                        <Text style={styles.licenseCardDesc}>Chứng nhận tình trạng pháp lý tốt của công ty</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => setOpenDocId(openDocId === 'good-standing' ? null : 'good-standing')}
                                        style={({ pressed }) => [styles.licenseBtn, styles.licenseBtnGreen, pressed && styles.licenseBtnPressed]}
                                    >
                                        <Text style={[styles.licenseBtnText, styles.licenseBtnTextGreen]}>
                                            {openDocId === 'good-standing' ? 'Ẩn tài liệu' : 'Xem tài liệu'}
                                        </Text>
                                    </Pressable>
                                </View>

                                {openDocId === 'good-standing' ? (
                                    <View style={styles.docViewerWrap}>
                                        <WebView
                                            source={{
                                                uri: 'https://docs.google.com/gview?url=https%3A%2F%2Fblobs.vusercontent.net%2Fblob%2FCertificate-of-Good-Standing-RHg6FKqbt21TmPF9c1ujzlIY5WCo3c.pdf&embedded=true',
                                            }}
                                            style={styles.docViewer}
                                        />
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.licenseCardWrap}>
                                <View style={styles.licenseCard}>
                                    <View style={styles.licenseCardTextWrap}>
                                        <Text style={styles.licenseCardTitle}>Business Profile (Co)</Text>
                                        <Text style={styles.licenseCardDesc}>Hồ sơ kinh doanh công ty</Text>
                                    </View>
                                    <Pressable
                                        onPress={() => setOpenDocId(openDocId === 'business' ? null : 'business')}
                                        style={({ pressed }) => [styles.licenseBtn, styles.licenseBtnBlue, pressed && styles.licenseBtnPressed]}
                                    >
                                        <Text style={[styles.licenseBtnText, styles.licenseBtnTextBlue]}>
                                            {openDocId === 'business' ? 'Ẩn tài liệu' : 'Xem tài liệu'}
                                        </Text>
                                    </Pressable>
                                </View>

                                {openDocId === 'business' ? (
                                    <View style={styles.docViewerWrap}>
                                        <WebView
                                            source={{
                                                uri: 'https://docs.google.com/gview?url=https%3A%2F%2Fblobs.vusercontent.net%2Fblob%2FBusiness%2520Profile-xzpZAQLsciE2Vuegzohee27cUfguVs.pdf&embedded=true',
                                            }}
                                            style={styles.docViewer}
                                        />
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.bottomMenu}>
                    <Pressable
                        onPress={() => handleTabChange('home')}
                        style={({ pressed }) => [
                            styles.menuItem,
                            activeTab === 'home' && styles.menuItemActive,
                            pressed && styles.menuItemPressed,
                        ]}
                    >
                        <Text style={[styles.menuText, activeTab === 'home' && styles.menuTextActive]}>Trang chủ</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handleTabChange('terms')}
                        style={({ pressed }) => [
                            styles.menuItem,
                            activeTab === 'terms' && styles.menuItemActive,
                            pressed && styles.menuItemPressed,
                        ]}
                    >
                        <Text style={[styles.menuText, activeTab === 'terms' && styles.menuTextActive]}>Điều khoản</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handleTabChange('license')}
                        style={({ pressed }) => [
                            styles.menuItem,
                            activeTab === 'license' && styles.menuItemActive,
                            pressed && styles.menuItemPressed,
                        ]}
                    >
                        <Text style={[styles.menuText, activeTab === 'license' && styles.menuTextActive]}>Giấy phép</Text>
                    </Pressable>
                </View>

                {showSportsGate ? (
                    <View style={styles.sportsGateOverlay}>
                        <View style={styles.sportsGateCard}>
                            <Pressable
                                onPress={() => setShowSportsGate(false)}
                                style={({ pressed }) => [styles.sportsGateCloseBtn, pressed && styles.sportsGateCloseBtnPressed]}
                            >
                                <Text style={styles.sportsGateCloseText}>X</Text>
                            </Pressable>

                            <Image source={{ uri: SPORTS_GATE_IMAGE }} style={styles.sportsGateImage} contentFit="contain" />

                            <Pressable
                                onPress={() => setSportsTermsAccepted((prev) => !prev)}
                                style={({ pressed }) => [styles.sportsGateTermsRow, pressed && styles.sportsGateTermsRowPressed]}
                            >
                                <View style={[styles.sportsGateCheckbox, sportsTermsAccepted && styles.sportsGateCheckboxChecked]}>
                                    {sportsTermsAccepted ? <Text style={styles.sportsGateCheckboxMark}>✓</Text> : null}
                                </View>
                                <Text style={styles.sportsGateTermsText}>Tôi đồng ý với</Text>
                                <Pressable
                                    onPress={() => {
                                        setShowSportsGate(false);
                                        setActiveTab('terms');
                                    }}
                                >
                                    <Text style={styles.sportsGateTermsLink}>điều khoản của hệ thống</Text>
                                </Pressable>
                            </Pressable>

                            <Pressable
                                onPress={handleContinueToSports}
                                disabled={!sportsTermsAccepted}
                                style={({ pressed }) => [
                                    styles.sportsGateContinueBtn,
                                    !sportsTermsAccepted && styles.sportsGateContinueBtnDisabled,
                                    pressed && sportsTermsAccepted && styles.sportsGateContinueBtnPressed,
                                ]}
                            >
                                <Text style={[styles.sportsGateContinueText, !sportsTermsAccepted && styles.sportsGateContinueTextDisabled]}>
                                    Tiếp tục
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}

                {showGanh18Gate ? (
                    <View style={styles.ganh18GateOverlay}>
                        <View style={styles.ganh18GateCard}>
                            <Pressable
                                onPress={() => {
                                    setShowGanh18Gate(false);
                                    setGanh18Password('');
                                    setGanh18PasswordError('');
                                }}
                                style={({ pressed }) => [styles.ganh18GateCloseBtn, pressed && styles.ganh18GateCloseBtnPressed]}
                            >
                                <Text style={styles.ganh18GateCloseText}>X</Text>
                            </Pressable>

                            <Text style={styles.ganh18GateTitle}>Cảnh báo nội dung 18+</Text>
                            <Text style={styles.ganh18GateDescription}>
                                Khu vực này chứa nội dung dành cho người trưởng thành. Bạn phải xác minh tính hợp pháp để tiếp tục.
                            </Text>
                            <Text style={styles.ganh18GateDescription}>
                                Vì chưa hoàn thành nên sẽ cần mật khẩu. Xin lỗi vì sự bất tiện này!!!
                            </Text>

                            <View style={styles.ganh18PasswordBox}>
                                <TextInput
                                    style={styles.ganh18PasswordInput}
                                    placeholder="Nhập mật khẩu..."
                                    placeholderTextColor="#8FA2D5"
                                    secureTextEntry
                                    value={ganh18Password}
                                    onChangeText={(text) => {
                                        setGanh18Password(text);
                                        setGanh18PasswordError('');
                                    }}
                                />
                            </View>
                            {ganh18PasswordError ? (
                                <Text style={styles.ganh18PasswordError}>{ganh18PasswordError}</Text>
                            ) : null}

                            <Pressable
                                onPress={handleVerifyGanh18}
                                style={({ pressed }) => [styles.ganh18GateContinueBtn, pressed && styles.ganh18GateContinueBtnPressed]}
                            >
                                <Text style={styles.ganh18GateContinueText}>Tôi đã 18 tuổi - Tiếp tục</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : null}
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0A1436',
    },
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
    },
    scrollArea: {
        flex: 1,
    },
    header: {
        marginBottom: 12,
    },
    brandImage: {
        width: 288,
        height: 78,
        alignSelf: 'flex-start',
    },
    brandSubImage: {
        marginTop: 2,
        width: 196,
        height: 36,
        opacity: 0.8,
        alignSelf: 'flex-start',
    },
    heroWrap: {
        marginBottom: 14,
    },
    hero: {
        minHeight: 260,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#32457E',
        overflow: 'hidden',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    star: {
        position: 'absolute',
        width: 3,
        height: 3,
        borderRadius: 20,
        backgroundColor: '#FFF8B6',
    },
    heroBadge: {
        alignSelf: 'flex-end',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(78, 209, 177, 0.18)',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#53CDAE',
    },
    heroBadgeText: {
        color: '#A8F5DE',
        fontSize: 12,
        fontWeight: '700',
    },
    heroTitle: {
        marginTop: 25,
        color: '#F3F7FF',
        fontSize: 24,
        lineHeight: 35,
        fontWeight: '800',
    },
    heroText: {
        marginTop: 14,
        color: '#C7D0ED',
        fontSize: 15,
        lineHeight: 22,
        maxWidth: '95%',
    },
    sectionTitle: {
        color: '#EAF0FF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 10,
    },
    cardsContainer: {
        gap: 10,
    },
    featureCard: {
        minHeight: 162,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2E3E74',
    },
    featureCardDisabled: {
        opacity: 0.78,
    },
    featureCardPressed: {
        transform: [{ scale: 0.99 }],
    },
    featureCardSurface: {
        flex: 1,
        backgroundColor: '#1A2347',
    },
    featureCardSurfaceDisabled: {
        backgroundColor: '#172041',
    },
    cardMediaRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '50%',
    },
    cardMediaImage: {
        width: '100%',
        height: '100%',
    },
    cardShade: {
        ...StyleSheet.absoluteFillObject,
    },
    featureCardContent: {
        zIndex: 2,
        paddingHorizontal: 10,
        paddingVertical: 12,
    },
    cardTopRow: {
        justifyContent: 'flex-start',
    },
    cardTitleWrap: {
        width: '100%',
        alignItems: 'flex-start',
    },
    featureTitle: {
        color: '#F4F7FF',
        fontSize: 22,
        fontWeight: '800',
    },
    cardTitleLogo: {
        width: '100%',
        maxWidth: 220,
        height: 50,
        alignSelf: 'flex-start',
    },
    featureSubtitle: {
        marginTop: 1,
        color: '#EB3E44',
        fontSize: 12,
        fontWeight: '500',
    },
    featureDescription: {
        marginTop: 10,
        color: '#D7DEEF',
        fontSize: 14,
        lineHeight: 20,
        maxWidth: '72%',
    },
    featureActionRow: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureActionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(235, 241, 255, 0.14)',
        backgroundColor: 'rgba(23, 33, 66, 0.72)',
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    featureActionPillDisabled: {
        borderColor: 'rgba(170, 182, 210, 0.2)',
        backgroundColor: 'rgba(20, 30, 58, 0.75)',
    },
    featureAction: {
        color: '#EBF1FF',
        fontSize: 15,
        fontWeight: '700',
    },
    featureActionDisabled: {
        color: '#9FAACC',
    },
    termsWrap: {
        gap: 10,
        paddingBottom: 8,
    },
    termsTitle: {
        color: '#F2F6FF',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 2,
    },
    termsBlock: {
        borderWidth: 1,
        borderColor: '#2E3E74',
        backgroundColor: 'rgba(19, 34, 82, 0.86)',
        borderRadius: 14,
        padding: 12,
        gap: 8,
    },
    termsBlockTitle: {
        color: '#F2F6FF',
        fontSize: 16,
        fontWeight: '700',
    },
    termsText: {
        color: '#BFC9E8',
        fontSize: 14,
        lineHeight: 21,
    },
    licenseSection: {
        marginTop: 4,
        gap: 10,
        paddingBottom: 8,
    },
    licenseTitle: {
        color: '#F2F6FF',
        fontSize: 22,
        fontWeight: '800',
    },
    licenseSubtitle: {
        color: '#8FA2D5',
        fontSize: 13,
        marginBottom: 4,
    },
    licenseCard: {
        borderWidth: 1,
        borderColor: '#2E3E74',
        backgroundColor: 'rgba(20, 31, 71, 0.92)',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    licenseCardWrap: {
        borderWidth: 1,
        borderColor: '#2E3E74',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: 'rgba(20, 31, 71, 0.92)',
    },
    licenseCardTextWrap: {
        flex: 1,
        paddingRight: 8,
    },
    licenseCardTitle: {
        color: '#EEF3FF',
        fontSize: 16,
        fontWeight: '700',
    },
    licenseCardDesc: {
        color: '#A2B2DE',
        fontSize: 13,
        marginTop: 2,
    },
    licenseBtn: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    licenseBtnGreen: {
        backgroundColor: '#123A24',
    },
    licenseBtnBlue: {
        backgroundColor: '#142C55',
    },
    licenseBtnPressed: {
        opacity: 0.8,
    },
    licenseBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
    licenseBtnTextGreen: {
        color: '#49E08C',
    },
    licenseBtnTextBlue: {
        color: '#4CA8FF',
    },
    docViewerWrap: {
        height: 520,
        borderTopWidth: 1,
        borderTopColor: '#2E3E74',
        backgroundColor: '#0F1A42',
    },
    docViewer: {
        flex: 1,
        backgroundColor: '#0F1A42',
    },
    bottomMenu: {
        borderTopWidth: 1,
        borderTopColor: '#243770',
        backgroundColor: '#0E1D4D',
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
    },
    menuItem: {
        flex: 1,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#2E3E74',
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#132658',
    },
    menuItemActive: {
        borderColor: '#D9BE54',
        backgroundColor: '#2A2F57',
    },
    menuItemPressed: {
        opacity: 0.85,
    },
    menuText: {
        color: '#AAB7DC',
        fontSize: 15,
        fontWeight: '600',
    },
    menuTextActive: {
        color: '#F2D35F',
    },
    sportsGateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4, 10, 28, 0.76)',
        paddingHorizontal: 18,
        justifyContent: 'center',
    },
    sportsGateCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#425EA5',
        backgroundColor: '#0D1D4E',
        padding: 12,
    },
    sportsGateCloseBtn: {
        alignSelf: 'flex-end',
        width: 30,
        height: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#203A7B',
        marginBottom: 8,
    },
    sportsGateCloseBtnPressed: {
        opacity: 0.82,
    },
    sportsGateCloseText: {
        color: '#EEF3FF',
        fontSize: 15,
        fontWeight: '800',
    },
    sportsGateImage: {
        width: '100%',
        height: 380,
        borderRadius: 14,
        backgroundColor: '#0A173E',
    },
    sportsGateTermsRow: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    sportsGateTermsRowPressed: {
        opacity: 0.9,
    },
    sportsGateCheckbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: '#7E93C9',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#13295E',
    },
    sportsGateCheckboxChecked: {
        borderColor: '#F0D56A',
        backgroundColor: '#324062',
    },
    sportsGateCheckboxMark: {
        color: '#F8DF7A',
        fontSize: 12,
        fontWeight: '800',
        lineHeight: 14,
    },
    sportsGateTermsText: {
        color: '#C6D1EE',
        fontSize: 14,
    },
    sportsGateTermsLink: {
        color: '#8BC3FF',
        fontSize: 14,
        textDecorationLine: 'underline',
        fontWeight: '600',
    },
    sportsGateContinueBtn: {
        marginTop: 14,
        backgroundColor: '#E7C85A',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    sportsGateContinueBtnDisabled: {
        backgroundColor: '#46537A',
    },
    sportsGateContinueBtnPressed: {
        opacity: 0.88,
    },
    sportsGateContinueText: {
        color: '#1A2550',
        fontSize: 15,
        fontWeight: '800',
    },
    sportsGateContinueTextDisabled: {
        color: '#A6B2D2',
    },
    ganh18GateOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4, 10, 28, 0.76)',
        paddingHorizontal: 18,
        justifyContent: 'center',
    },
    ganh18GateCard: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#FF6B7A',
        backgroundColor: '#0D1D4E',
        padding: 16,
        gap: 12,
    },
    ganh18GateCloseBtn: {
        alignSelf: 'flex-end',
        width: 30,
        height: 30,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF6B7A',
        marginBottom: 4,
    },
    ganh18GateCloseBtnPressed: {
        opacity: 0.82,
    },
    ganh18GateCloseText: {
        color: '#FFF6FF',
        fontSize: 15,
        fontWeight: '800',
    },
    ganh18GateTitle: {
        color: '#FF6B7A',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    ganh18GateDescription: {
        color: '#D7DEEF',
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 8,
    },
    ganh18PasswordBox: {
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginBottom: 4,
    },
    ganh18PasswordInput: {
        color: '#EBF1FF',
        fontSize: 14,
        fontWeight: '600',
    },
    ganh18PasswordError: {
        color: '#FF6B7A',
        fontSize: 12,
        fontWeight: '600',
        marginHorizontal: 4,
        marginBottom: 8,
    },
    ganh18GateContinueBtn: {
        marginTop: 8,
        backgroundColor: '#FF6B7A',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    ganh18GateContinueBtnPressed: {
        opacity: 0.88,
    },
    ganh18GateContinueText: {
        color: '#FFF6FF',
        fontSize: 15,
        fontWeight: '800',
    },
});